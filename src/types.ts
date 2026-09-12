export interface ManualCitation {
  documentName: string;
  pageNumber: number | string;
  passageSnippet: string;
  chunkId?: string;
}

export interface ProcedureStep {
  stepNumber: number;
  text: string;
  citation: ManualCitation;
}

export interface ManualChunk {
  id: string;
  documentName: string;
  brand: string;
  model: string;
  pageNumber: number | string;
  sectionTitle: string;
  text: string;
  tokensCount: number;
  embedding?: number[];
}

export interface RRFChunkResult {
  chunk: ManualChunk;
  denseRank: number;
  denseScore: number;
  keywordRank: number;
  keywordScore: number;
  rrfScore: number;
}

export interface QueryResponse {
  queryId: string;
  status: 'answered' | 'refused';
  refusalReason?: string | null;
  equipmentMatch: string;
  safetyCallout?: string | null;
  procedureSteps: ProcedureStep[];
  topChunks: RRFChunkResult[];
  latencyMs: number;
  confidence?: number;
  stats: {
    totalChunksSearched: number;
    topDenseScore: number;
    topKeywordScore: number;
    topRrfScore: number;
    confidence?: number;
    brand: string;
    model: string;
  };
}

export interface EscalationChunkSnippet {
  id: string;
  documentName: string;
  brand?: string;
  model?: string;
  pageNumber: number | string;
  sectionTitle: string;
  denseScore: number;
  keywordScore: number;
  textSnippet: string;
}

export interface EscalationRecord {
  id: string;
  brand: string;
  model: string;
  question: string;
  retrievedChunks: EscalationChunkSnippet[];
  timestamp: string;
  status: 'pending' | 'in_review' | 'resolved';
}

export interface ManualDocument {
  id: string;
  documentName: string;
  brand: string;
  model: string;
  totalPages: number;
  totalChunks: number;
  uploadedAt: string;
}

export interface FeedbackRecord {
  id: string;
  queryId: string;
  rating: 'up' | 'down';
  note: string;
  question: string;
  brand: string;
  model: string;
  chunkIds: string[];
  answerStatus: 'answered' | 'refused';
  procedureSteps: ProcedureStep[];
  timestamp: string;
}

export interface QueryLogRecord {
  id: string;
  brand: string;
  model: string;
  question: string;
  status: 'answered' | 'refused';
  chunkIds: string[];
  timestamp: string;
}

export interface UsageStats {
  totalQuestions: number;
  answered: number;
  refused: number;
  answerRate: number;
  refusalRate: number;
  thumbsDown: number;
  thumbsUp: number;
  thumbsDownRate: number;
}

export interface LibraryGap {
  brand: string;
  model: string;
  count: number;
  latestQuestion: string;
  latestTimestamp: string;
}

export interface CachedAnswer {
  savedAt: string;
  brand: string;
  model: string;
  question: string;
  response: QueryResponse;
}
