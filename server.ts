import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { jsonErrorHandler, rateLimit, requireJsonContentType, securityHeaders } from './server/middleware.js';
import {
  LIMITS,
  ValidationError,
  optionalString,
  redactPii,
  requireArray,
  requireObjectBody,
  requireString,
} from './server/validation.js';
import {
  manualChunksStore,
  seedInitialManuals,
  splitTextIntoChunks,
  embedText,
  performRRF,
  generateGroundedAnswer,
  buildAbstentionRefusal,
  fusedConfidence,
  libraryCoversBrand,
  newQueryId,
  isGeminiConfigured,
} from './server/ragEngine.js';
import type {
  EscalationRecord,
  EscalationChunkSnippet,
  FeedbackRecord,
  LibraryGap,
  ManualDocument,
  QueryLogRecord,
  QueryResponse,
  UsageStats,
} from './src/types.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

app.disable('x-powered-by');
app.use(securityHeaders);
app.use('/api', requireJsonContentType);
app.use(express.json({ limit: '1mb' }));

// Retrieval and ingestion spend embedding/generation quota, so they get tighter
// budgets than the cheap append-only feedback and escalation writes.
const queryLimiter = rateLimit({
  windowMs: 60_000,
  max: 40,
  message: 'Too many questions in a short time. Wait a minute and try again.',
});

const ingestLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  message: 'Too many manual uploads in a short time. Wait a minute and try again.',
});

const writeLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  message: 'Too many submissions in a short time. Wait a minute and try again.',
});

const escalationsStore: EscalationRecord[] = [];
const queryLogs: QueryLogRecord[] = [];
const feedbackStore: FeedbackRecord[] = [];

const MAX_STORED_LOGS = 500;
const MAX_STORED_CHUNKS = 5_000;
let chunkIdCounter = 0;

function nextChunkId(): string {
  chunkIdCounter += 1;
  return `chunk_${chunkIdCounter}`;
}

/** Seeding assigns its own ids, so the counter has to resume past them to stay unique. */
function syncChunkCounter() {
  chunkIdCounter = Math.max(chunkIdCounter, manualChunksStore.length);
}

/** Keeps unbounded client input from growing the in-memory stores without limit. */
function capStore<T>(store: T[], max = MAX_STORED_LOGS) {
  if (store.length > max) store.length = max;
}

function sendValidationError(res: express.Response, err: unknown): boolean {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
    return true;
  }
  return false;
}

function listManuals(): { manuals: ManualDocument[]; totalChunks: number } {
  const manualsMap = new Map<string, ManualDocument>();
  for (const chunk of manualChunksStore) {
    const docKey = `${chunk.documentName}::${chunk.brand}::${chunk.model}`;
    const existing = manualsMap.get(docKey);
    const page = Number(chunk.pageNumber) || 1;
    if (!existing) {
      manualsMap.set(docKey, {
        id: docKey,
        documentName: chunk.documentName,
        brand: chunk.brand,
        model: chunk.model,
        totalPages: page,
        totalChunks: 1,
        uploadedAt: new Date().toISOString(),
      });
    } else {
      existing.totalChunks += 1;
      existing.totalPages = Math.max(existing.totalPages, page);
    }
  }
  return { manuals: Array.from(manualsMap.values()), totalChunks: manualChunksStore.length };
}

function usageStats(): UsageStats {
  const totalQuestions = queryLogs.length;
  const answered = queryLogs.filter((q) => q.status === 'answered').length;
  const refused = queryLogs.filter((q) => q.status === 'refused').length;
  const thumbsDown = feedbackStore.filter((f) => f.rating === 'down').length;
  const thumbsUp = feedbackStore.filter((f) => f.rating === 'up').length;
  const rated = thumbsDown + thumbsUp;
  return {
    totalQuestions,
    answered,
    refused,
    answerRate: totalQuestions === 0 ? 0 : answered / totalQuestions,
    refusalRate: totalQuestions === 0 ? 0 : refused / totalQuestions,
    thumbsDown,
    thumbsUp,
    thumbsDownRate: rated === 0 ? 0 : thumbsDown / rated,
  };
}

function libraryGaps(): LibraryGap[] {
  const grouped = new Map<string, LibraryGap>();
  for (const esc of escalationsStore) {
    const key = `${esc.brand}::${esc.model}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        brand: esc.brand,
        model: esc.model,
        count: 1,
        latestQuestion: esc.question,
        latestTimestamp: esc.timestamp,
      });
    } else {
      existing.count += 1;
      if (esc.timestamp > existing.latestTimestamp) {
        existing.latestQuestion = esc.question;
        existing.latestTimestamp = esc.timestamp;
      }
    }
  }
  return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
}

function logQuery(response: QueryResponse, brand: string, model: string, question: string) {
  queryLogs.unshift({
    id: response.queryId,
    brand,
    model,
    question,
    status: response.status,
    chunkIds: response.topChunks.map((c) => c.chunk.id),
    timestamp: new Date().toISOString(),
  });
  capStore(queryLogs);
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    totalChunks: manualChunksStore.length,
    geminiKeySet: isGeminiConfigured(),
  });
});

app.get('/api/manuals', (_req, res) => {
  res.json(listManuals());
});

app.get('/api/chunks/:id', (req, res) => {
  const chunk = manualChunksStore.find((c) => c.id === req.params.id);
  if (!chunk) {
    res.status(404).json({ error: 'Chunk not found' });
    return;
  }
  const { embedding: _embedding, ...safe } = chunk;
  res.json({ chunk: safe });
});

app.post('/api/manuals/ingest', ingestLimiter, async (req, res) => {
  let documentName: string;
  let cleanBrand: string;
  let cleanModel: string;
  let text: string;
  let basePage: number;

  try {
    const body = requireObjectBody(req.body);
    documentName = requireString(body.documentName, 'Document title', LIMITS.documentName);
    text = requireString(body.text, 'Manual text', LIMITS.manualText);
    cleanBrand = optionalString(body.brand, 'Brand', LIMITS.brand, 'Custom');
    cleanModel = optionalString(body.model, 'Model', LIMITS.model, 'Unit');
    const pageInput = body.defaultPage;
    if (pageInput !== undefined && pageInput !== null && pageInput !== '') {
      const parsed = Number(pageInput);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10_000) {
        throw new ValidationError('Starting page must be a whole number between 1 and 10000.');
      }
      basePage = parsed;
    } else {
      basePage = 1;
    }
    if (text.length < 50) {
      throw new ValidationError('Manual text must be at least 50 characters.');
    }
  } catch (err) {
    if (sendValidationError(res, err)) return;
    throw err;
  }

  try {
    const rawChunks = splitTextIntoChunks(text, documentName, cleanBrand, cleanModel, basePage);

    if (rawChunks.length === 0) {
      res.status(400).json({ error: 'No valid text content found to chunk.' });
      return;
    }

    if (manualChunksStore.length + rawChunks.length > MAX_STORED_CHUNKS) {
      res.status(507).json({ error: 'Manual library is full. Restart the server to reset the index.' });
      return;
    }

    for (const raw of rawChunks) {
      manualChunksStore.push({
        ...raw,
        id: nextChunkId(),
        embedding: await embedText(raw.text),
      });
    }

    res.json({
      success: true,
      documentName,
      brand: cleanBrand,
      model: cleanModel,
      chunksCreated: rawChunks.length,
      message: `Successfully ingested ${rawChunks.length} chunks (~900 tokens each with 15% overlap).`,
    });
  } catch (err) {
    console.error('Ingest error:', err);
    res.status(500).json({ error: 'Failed to ingest manual document.' });
  }
});

app.post('/api/query', queryLimiter, async (req, res) => {
  const startTime = Date.now();
  let brand: string;
  let model: string;
  let question: string;

  try {
    const body = requireObjectBody(req.body);
    question = requireString(body.question, 'Question', LIMITS.question);
    brand = optionalString(body.brand, 'Brand', LIMITS.brand);
    model = optionalString(body.model, 'Model', LIMITS.model);
    if (question.length < 8) {
      throw new ValidationError('Question must be at least 8 characters.');
    }
  } catch (err) {
    if (sendValidationError(res, err)) return;
    throw err;
  }

  try {
    if (manualChunksStore.length === 0) {
      await seedInitialManuals();
      syncChunkCounter();
    }

    const queryId = newQueryId();

    if (brand.trim() && !libraryCoversBrand(brand)) {
      const refusal = buildAbstentionRefusal(brand, model, question, [], 0, startTime, queryId);
      logQuery(refusal, brand, model, question);
      res.json(refusal);
      return;
    }

    const queryText = `${brand} ${model} ${question}`.trim();
    const queryEmbedding = await embedText(queryText);
    const top6Chunks = performRRF(manualChunksStore, queryText, queryEmbedding, 6, 60);
    const confidence = fusedConfidence(top6Chunks[0]);
    const CONFIDENCE_THRESHOLD = 0.35;

    if (top6Chunks.length === 0 || confidence < CONFIDENCE_THRESHOLD) {
      const refusal = buildAbstentionRefusal(
        brand,
        model,
        question,
        top6Chunks,
        confidence,
        startTime,
        queryId,
      );
      logQuery(refusal, brand, model, question);
      res.json(refusal);
      return;
    }

    const answerResult = await generateGroundedAnswer(brand, model, question, top6Chunks, queryId);
    logQuery(answerResult, brand, model, question);
    res.json(answerResult);
  } catch (err) {
    console.error('Query processing error:', err);
    res.status(500).json({ error: 'Internal error processing diagnostic query.' });
  }
});

app.post('/api/escalations', writeLimiter, (req, res) => {
  type IncomingChunk = {
    denseScore?: number;
    keywordScore?: number;
    chunk?: EscalationChunkSnippet & { text?: string; brand?: string; model?: string };
    id?: string;
    documentName?: string;
    pageNumber?: number | string;
    sectionTitle?: string;
    text?: string;
    brand?: string;
    model?: string;
  };

  let brand: string;
  let model: string;
  let question: string;
  let chunks: IncomingChunk[];

  try {
    const body = requireObjectBody(req.body);
    question = requireString(body.question, 'Question', LIMITS.question);
    brand = optionalString(body.brand, 'Brand', LIMITS.brand, 'Unspecified Brand');
    model = optionalString(body.model, 'Model', LIMITS.model, 'Unspecified Model');
    chunks = requireArray(body.chunks, 'Retrieved chunks', LIMITS.chunks).filter(
      (c): c is IncomingChunk => Boolean(c) && typeof c === 'object',
    );
  } catch (err) {
    if (sendValidationError(res, err)) return;
    throw err;
  }

  try {
    const formattedChunks: EscalationChunkSnippet[] = chunks.map((c, idx) => {
      const chunkData = (c.chunk || c) as {
        id?: string;
        documentName?: string;
        brand?: string;
        model?: string;
        pageNumber?: number | string;
        sectionTitle?: string;
        text?: string;
        textSnippet?: string;
      };
      const asText = (value: unknown, max: number) =>
        typeof value === 'string' ? value.slice(0, max) : '';
      return {
        id: asText(chunkData.id, 60) || `chunk_${idx}`,
        documentName: asText(chunkData.documentName, LIMITS.documentName) || 'Unknown Document',
        brand: asText(chunkData.brand, LIMITS.brand) || undefined,
        model: asText(chunkData.model, LIMITS.model) || undefined,
        pageNumber: asText(chunkData.pageNumber, 12) || Number(chunkData.pageNumber) || '1',
        sectionTitle: asText(chunkData.sectionTitle, 200),
        denseScore: Number.isFinite(c.denseScore) ? Number(c.denseScore) : 0,
        keywordScore: Number.isFinite(c.keywordScore) ? Number(c.keywordScore) : 0,
        textSnippet: asText(chunkData.text || chunkData.textSnippet, 300),
      };
    });

    const escalation: EscalationRecord = {
      id: `ESC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      brand,
      model,
      question,
      retrievedChunks: formattedChunks,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    escalationsStore.unshift(escalation);
    capStore(escalationsStore);
    res.status(201).json({
      success: true,
      escalation,
      message: 'Escalation recorded successfully for senior technician review.',
    });
  } catch (err) {
    console.error('Escalation creation error:', err);
    res.status(500).json({ error: 'Failed to record senior technician escalation.' });
  }
});

app.get('/api/escalations', (_req, res) => {
  res.json({ total: escalationsStore.length, escalations: escalationsStore });
});

app.post('/api/feedback', writeLimiter, (req, res) => {
  try {
    const body = requireObjectBody(req.body);
    const queryId = requireString(body.queryId, 'Query id', 60);
    const rating = body.rating;
    if (rating !== 'up' && rating !== 'down') {
      throw new ValidationError('Rating must be "up" or "down".');
    }

    const rawNote = optionalString(body.note, 'Note', LIMITS.note);
    const chunkIds = requireArray(body.chunkIds, 'Chunk ids', LIMITS.chunkIds)
      .filter((id): id is string => typeof id === 'string')
      .map((id) => id.slice(0, 60));
    const steps = requireArray(body.procedureSteps, 'Procedure steps', LIMITS.procedureSteps);
    const answerStatus = body.answerStatus === 'refused' ? 'refused' : 'answered';

    const record: FeedbackRecord = {
      id: `FB-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      queryId,
      rating,
      note: redactPii(rawNote),
      question: optionalString(body.question, 'Question', LIMITS.question),
      brand: optionalString(body.brand, 'Brand', LIMITS.brand),
      model: optionalString(body.model, 'Model', LIMITS.model),
      chunkIds,
      answerStatus,
      procedureSteps: steps as FeedbackRecord['procedureSteps'],
      timestamp: new Date().toISOString(),
    };
    feedbackStore.unshift(record);
    capStore(feedbackStore);
    res.status(201).json({ success: true, feedback: record });
  } catch (err) {
    if (sendValidationError(res, err)) return;
    console.error('Feedback error:', err);
    res.status(500).json({ error: 'Failed to record feedback.' });
  }
});

app.get('/api/admin/stats', (_req, res) => {
  res.json({
    usage: usageStats(),
    gaps: libraryGaps(),
    manuals: listManuals().manuals,
    totalChunks: manualChunksStore.length,
    recentQuestions: queryLogs.slice(0, 25),
    recentFeedback: feedbackStore.slice(0, 25),
  });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Unknown API endpoint.' });
});

async function startServer() {
  await seedInitialManuals();
  syncChunkCounter();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use(jsonErrorHandler);

  app.listen(PORT, HOST, () => {
    console.log(`Fieldnote AI running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fieldnote AI failed to start:', err);
  process.exit(1);
});
