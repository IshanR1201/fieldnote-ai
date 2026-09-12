import { GoogleGenAI, Type, Schema } from '@google/genai';
import type { ManualChunk, ProcedureStep, QueryResponse, RRFChunkResult } from '../src/types.js';
import { SEED_MANUALS } from './seedData.js';
import dotenv from 'dotenv';

dotenv.config();

const CONFIDENCE_THRESHOLD = 0.35;
let genAIClient: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }
  return genAIClient;
}

export const manualChunksStore: ManualChunk[] = [];

export function isGeminiConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '');
}

function createFallbackVector(text: string, dim = 768): number[] {
  const vec = new Array(dim).fill(0);
  const words = tokenize(text);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }
    const idx1 = Math.abs(hash) % dim;
    const idx2 = Math.abs(hash * 31 + i) % dim;
    vec[idx1] += 1.0;
    vec[idx2] += 0.5;
  }
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) vec[i] /= norm;
  }
  return vec;
}

export async function embedText(text: string): Promise<number[]> {
  try {
    if (!isGeminiConfigured()) return createFallbackVector(text);
    const ai = getGenAI();
    const result = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: text,
    });
    const resAny = result as {
      embedding?: { values?: number[] };
      embeddings?: Array<{ values?: number[] }>;
    };
    const values = resAny.embedding?.values || resAny.embeddings?.[0]?.values;
    if (values && values.length > 0) return values;
    return createFallbackVector(text);
  } catch (err) {
    console.warn('Embedding API call failed, using fallback vectorizer:', (err as Error).message);
    return createFallbackVector(text);
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom <= 0) return 0;
  return dot / denom;
}

export function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const spaced = lower.replace(/[-_/]/g, ' ').replace(/[^\w\d\.]/g, ' ');
  const compact = lower.replace(/[-_/\s]/g, '');
  const tokens = spaced.split(/\s+/).filter((t) => t.length > 1);
  if (compact.length > 2) tokens.push(compact);
  return [...new Set(tokens)];
}

export function calculateKeywordScore(queryTokens: string[], chunkText: string): number {
  const docTokens = tokenize(chunkText);
  if (docTokens.length === 0 || queryTokens.length === 0) return 0;

  const docFreqs: Record<string, number> = {};
  for (const token of docTokens) {
    docFreqs[token] = (docFreqs[token] || 0) + 1;
  }

  let score = 0;
  const k1 = 1.2;
  const b = 0.75;
  const avgDocLen = 300;
  const docLenRatio = docTokens.length / avgDocLen;

  for (const qToken of queryTokens) {
    const tf = docFreqs[qToken] || 0;
    if (tf > 0) {
      const isCode = /[0-9]/.test(qToken) || qToken.length >= 4;
      const weight = isCode ? 2.5 : 1.0;
      const termScore = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * docLenRatio));
      score += termScore * weight;
    }
  }
  return score;
}

export function performRRF(
  chunks: ManualChunk[],
  query: string,
  queryEmbedding: number[],
  topK = 6,
  rrfConstant = 60,
): RRFChunkResult[] {
  const queryTokens = tokenize(query);

  const denseScored = chunks.map((chunk) => ({
    chunk,
    score: chunk.embedding ? cosineSimilarity(queryEmbedding, chunk.embedding) : 0,
  }));
  denseScored.sort((a, b) => b.score - a.score);
  const denseRanks = new Map<string, { rank: number; score: number }>();
  denseScored.forEach((item, idx) => {
    denseRanks.set(item.chunk.id, { rank: idx + 1, score: item.score });
  });

  const keywordScored = chunks.map((chunk) => ({
    chunk,
    score: calculateKeywordScore(queryTokens, chunk.text),
  }));
  keywordScored.sort((a, b) => b.score - a.score);
  const keywordRanks = new Map<string, { rank: number; score: number }>();
  keywordScored.forEach((item, idx) => {
    keywordRanks.set(item.chunk.id, { rank: idx + 1, score: item.score });
  });

  const rrfResults: RRFChunkResult[] = chunks.map((chunk) => {
    const dense = denseRanks.get(chunk.id) || { rank: chunks.length, score: 0 };
    const keyword = keywordRanks.get(chunk.id) || { rank: chunks.length, score: 0 };
    return {
      chunk,
      denseRank: dense.rank,
      denseScore: Number(dense.score.toFixed(4)),
      keywordRank: keyword.rank,
      keywordScore: Number(keyword.score.toFixed(4)),
      rrfScore: Number((1 / (rrfConstant + dense.rank) + 1 / (rrfConstant + keyword.rank)).toFixed(6)),
    };
  });

  rrfResults.sort((a, b) => b.rrfScore - a.rrfScore);
  return rrfResults.slice(0, topK);
}

export function splitTextIntoChunks(
  fullText: string,
  documentName: string,
  brand: string,
  model: string,
  defaultPage = 1,
): Array<Omit<ManualChunk, 'id' | 'embedding'>> {
  const result: Array<Omit<ManualChunk, 'id' | 'embedding'>> = [];
  const pageRegex = /(?:---\s*Page\s*(\d+)\s*---|\[Page\s*(\d+)\]|Page\s*(\d+):)/i;
  const lines = fullText.split('\n');
  let currentPage: number | string = defaultPage;
  let currentSectionTitle = `${brand} ${model} Service Documentation`;
  let buffer = '';
  const CHUNK_SIZE_CHARS = 3200;
  const OVERLAP_CHARS = 480;

  function flushBuffer(textToFlush: string, pageNum: number | string, section: string) {
    const trimmed = textToFlush.trim();
    if (trimmed.length < 50) return;
    const wordCount = trimmed.split(/\s+/).length;
    result.push({
      documentName,
      brand,
      model,
      pageNumber: pageNum,
      sectionTitle: section,
      text: trimmed,
      tokensCount: Math.round(wordCount * 1.3),
    });
  }

  for (const line of lines) {
    const match = line.match(pageRegex);
    if (match) {
      if (buffer.length > CHUNK_SIZE_CHARS) {
        flushBuffer(buffer, currentPage, currentSectionTitle);
        buffer = buffer.slice(-OVERLAP_CHARS);
      }
      currentPage = parseInt(match[1] || match[2] || match[3], 10) || currentPage;
      continue;
    }
    if (line.toUpperCase() === line && line.length > 5 && line.length < 80) {
      currentSectionTitle = line.trim();
    }
    buffer += (buffer.length > 0 ? '\n' : '') + line;
    if (buffer.length >= CHUNK_SIZE_CHARS) {
      flushBuffer(buffer, currentPage, currentSectionTitle);
      buffer = buffer.slice(-OVERLAP_CHARS);
    }
  }
  if (buffer.trim().length > 50) {
    flushBuffer(buffer, currentPage, currentSectionTitle);
  }
  return result;
}

export async function seedInitialManuals() {
  if (manualChunksStore.length > 0) return;
  console.log('Seeding initial HVAC manufacturer manuals into Fieldnote AI...');
  let chunkCounter = 1;
  for (const seed of SEED_MANUALS) {
    for (const sec of seed.sections) {
      const rawChunks = splitTextIntoChunks(
        `--- Page ${sec.pageNumber} ---\n${sec.sectionTitle}\n${sec.text}`,
        seed.documentName,
        seed.brand,
        seed.model,
        sec.pageNumber,
      );
      for (const raw of rawChunks) {
        manualChunksStore.push({
          ...raw,
          id: `chunk_${chunkCounter++}`,
          embedding: await embedText(raw.text),
        });
      }
    }
  }
  console.log(`Seeded ${manualChunksStore.length} chunks across ${SEED_MANUALS.length} manuals.`);
}

export function sanitizeTopChunks(chunks: RRFChunkResult[]): RRFChunkResult[] {
  return chunks.map((tc) => {
    const { embedding: _embedding, ...restChunk } = tc.chunk;
    return { ...tc, chunk: restChunk as ManualChunk };
  });
}

export function libraryCoversBrand(brand: string): boolean {
  const b = brand.trim().toLowerCase();
  if (!b) return true;
  return manualChunksStore.some((c) => {
    const cb = c.brand.toLowerCase();
    return cb.includes(b) || b.includes(cb);
  });
}

export function fusedConfidence(top: RRFChunkResult | undefined): number {
  if (!top) return 0;
  const keywordNorm = Math.min(1, top.keywordScore / 4);
  return Math.max(top.denseScore, keywordNorm);
}

export function newQueryId(): string {
  return `Q-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
}

export function buildAbstentionRefusal(
  brand: string,
  model: string,
  question: string,
  topChunks: RRFChunkResult[],
  topScore: number,
  startTime: number = Date.now(),
  queryId: string = newQueryId(),
): QueryResponse {
  const cleanTopChunks = sanitizeTopChunks(topChunks);
  return {
    queryId,
    status: 'refused',
    refusalReason: 'The manuals in your library do not cover this question.',
    equipmentMatch: `${brand} ${model}`.trim() || 'Unspecified Equipment',
    safetyCallout: null,
    procedureSteps: [],
    topChunks: cleanTopChunks,
    latencyMs: Date.now() - startTime,
    confidence: topScore,
    stats: {
      totalChunksSearched: manualChunksStore.length,
      topDenseScore: topChunks[0]?.denseScore || 0,
      topKeywordScore: topChunks[0]?.keywordScore || 0,
      topRrfScore: topChunks[0]?.rrfScore || 0,
      confidence: topScore,
      brand,
      model,
    },
  };
}

export async function generateGroundedAnswer(
  brand: string,
  model: string,
  question: string,
  topChunks: RRFChunkResult[],
  queryId: string = newQueryId(),
): Promise<QueryResponse> {
  const startTime = Date.now();
  const cleanTopChunks = sanitizeTopChunks(topChunks);
  const confidence = fusedConfidence(topChunks[0]);
  const highestDense = topChunks[0]?.denseScore || 0;
  const highestKeyword = topChunks[0]?.keywordScore || 0;
  const highestRrf = topChunks[0]?.rrfScore || 0;

  if (topChunks.length === 0 || confidence < CONFIDENCE_THRESHOLD) {
    return buildAbstentionRefusal(brand, model, question, topChunks, confidence, startTime, queryId);
  }

  const contextText = topChunks
    .map(
      (tc, idx) =>
        `[CHUNK ${idx + 1}]
Document: ${tc.chunk.documentName}
Page: ${tc.chunk.pageNumber}
Section: ${tc.chunk.sectionTitle}
Brand: ${tc.chunk.brand} | Model: ${tc.chunk.model}
Passage Content:
${tc.chunk.text}
----------------------------------------`,
    )
    .join('\n\n');

  const systemInstruction = `You are Fieldnote AI, an uncompromising grounded retrieval answer engine for HVAC and refrigeration technicians standing in front of an open unit.
CRITICAL HARDENED GROUNDING DIRECTIVES:
1. You answer ONLY from the exact manual passages provided in the prompt context. NEVER use general LLM knowledge.
2. If the provided passages do not fully support a step, you MUST omit that step rather than infer it.
3. You must NEVER produce a citation for a passage you were not given.
4. If the provided manual chunks do not contain the verified diagnostic procedure, you MUST REFUSE by setting status="refused" and refusalReason="The manuals in your library do not cover this question."
5. If answered, provide numbered operational procedure steps. Each step must contain a direct citation with documentName, pageNumber, and the verbatim passageSnippet.
6. If there is a high-voltage, high-pressure, chemical, or gas hazard, provide a concise safetyCallout.
7. Steps must be crisp, actionable, and free of conversational fluff.`;

  const userPrompt = `EQUIPMENT CONTEXT:
Brand: ${brand || 'Unspecified'}
Model: ${model || 'Unspecified'}

TECHNICIAN QUERY:
${question}

RETRIEVED MANUAL CHUNKS (ONLY SOURCE OF TRUTH):
${contextText}

CRITICAL RULES:
- If the provided passages do not fully support a step, omit that step rather than infer it.
- Never produce a citation for a passage you were not given.
- If the question cannot be answered purely from the chunks above, set status="refused" and refusalReason="The manuals in your library do not cover this question."

Generate the response strictly according to the schema.`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      status: { type: Type.STRING, enum: ['answered', 'refused'] },
      refusalReason: { type: Type.STRING },
      safetyCallout: { type: Type.STRING },
      equipmentMatch: { type: Type.STRING },
      procedureSteps: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            stepNumber: { type: Type.INTEGER },
            text: { type: Type.STRING },
            citation: {
              type: Type.OBJECT,
              properties: {
                documentName: { type: Type.STRING },
                pageNumber: { type: Type.STRING },
                passageSnippet: { type: Type.STRING },
              },
              required: ['documentName', 'pageNumber', 'passageSnippet'],
            },
          },
          required: ['stepNumber', 'text', 'citation'],
        },
      },
    },
    required: ['status', 'equipmentMatch', 'procedureSteps'],
  };

  try {
    if (!isGeminiConfigured()) {
      return generateLocalFallback(brand, model, question, topChunks, startTime, queryId);
    }

    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const parsed = JSON.parse(response.text || '{}') as {
      status?: string;
      refusalReason?: string;
      safetyCallout?: string;
      equipmentMatch?: string;
      procedureSteps?: Array<{
        stepNumber?: number;
        text: string;
        citation?: { documentName?: string; pageNumber?: string; passageSnippet?: string };
      }>;
    };

    const procedureSteps: ProcedureStep[] = (parsed.procedureSteps || []).map((step, idx) => {
      const matchingChunk = topChunks.find(
        (tc) =>
          tc.chunk.pageNumber.toString() === step.citation?.pageNumber?.toString() ||
          tc.chunk.documentName.toLowerCase().includes((step.citation?.documentName || '').toLowerCase()),
      );
      return {
        stepNumber: step.stepNumber || idx + 1,
        text: step.text,
        citation: {
          documentName: step.citation?.documentName || topChunks[0]?.chunk.documentName || 'Manual',
          pageNumber: step.citation?.pageNumber || topChunks[0]?.chunk.pageNumber || '1',
          passageSnippet: step.citation?.passageSnippet || step.text,
          chunkId: matchingChunk?.chunk.id || topChunks[0]?.chunk.id,
        },
      };
    });

    return {
      queryId,
      status: parsed.status === 'refused' ? 'refused' : 'answered',
      refusalReason: parsed.refusalReason || null,
      safetyCallout: parsed.safetyCallout || null,
      equipmentMatch: parsed.equipmentMatch || `${brand} ${model}`.trim() || 'HVAC System',
      procedureSteps: parsed.status === 'refused' ? [] : procedureSteps,
      topChunks: cleanTopChunks,
      latencyMs: Date.now() - startTime,
      confidence,
      stats: {
        totalChunksSearched: manualChunksStore.length,
        topDenseScore: highestDense,
        topKeywordScore: highestKeyword,
        topRrfScore: highestRrf,
        confidence,
        brand,
        model,
      },
    };
  } catch (err) {
    console.error('Gemini generation error, using fallback grounded parser:', err);
    return generateLocalFallback(brand, model, question, cleanTopChunks, startTime, queryId);
  }
}

function generateLocalFallback(
  brand: string,
  model: string,
  question: string,
  topChunks: RRFChunkResult[],
  startTime: number,
  queryId: string,
): QueryResponse {
  const cleanChunks = sanitizeTopChunks(topChunks);
  const top = cleanChunks[0];
  const confidence = fusedConfidence(top);

  if (!top || confidence < CONFIDENCE_THRESHOLD) {
    return buildAbstentionRefusal(brand, model, question, topChunks, confidence, startTime, queryId);
  }

  const lines = top.chunk.text.split('\n').filter((l) => l.trim().length > 0);
  const steps: ProcedureStep[] = [];
  let safetyCallout: string | null = null;

  for (const line of lines) {
    if (line.includes('WARNING:') || line.includes('CAUTION:')) {
      safetyCallout = line.replace(/^(WARNING:|CAUTION:)/, '').trim();
    } else if (/^\d+\.|\-/.test(line.trim())) {
      steps.push({
        stepNumber: steps.length + 1,
        text: line.replace(/^\d+\.|\-/, '').trim(),
        citation: {
          documentName: top.chunk.documentName,
          pageNumber: top.chunk.pageNumber,
          passageSnippet: line.trim(),
          chunkId: top.chunk.id,
        },
      });
    }
  }

  if (steps.length === 0) {
    steps.push({
      stepNumber: 1,
      text: top.chunk.text.slice(0, 280),
      citation: {
        documentName: top.chunk.documentName,
        pageNumber: top.chunk.pageNumber,
        passageSnippet: top.chunk.text.slice(0, 160),
        chunkId: top.chunk.id,
      },
    });
  }

  return {
    queryId,
    status: 'answered',
    refusalReason: null,
    safetyCallout:
      safetyCallout ||
      (top.chunk.brand === 'Carrier' ? 'Turn off 120VAC high-voltage power switch before opening blower door.' : null),
    equipmentMatch: `${top.chunk.brand} ${top.chunk.model}`,
    procedureSteps: steps.slice(0, 6),
    topChunks: cleanChunks,
    latencyMs: Date.now() - startTime,
    confidence,
    stats: {
      totalChunksSearched: manualChunksStore.length,
      topDenseScore: top.denseScore,
      topKeywordScore: top.keywordScore,
      topRrfScore: top.rrfScore,
      confidence,
      brand,
      model,
    },
  };
}
