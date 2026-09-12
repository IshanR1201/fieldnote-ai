import { ArrowUpRight, Layers, X } from 'lucide-react';
import { useDialog } from '../../lib/useDialog';
import type { ManualCitation, RRFChunkResult } from '../../types';

interface RrfInspectorProps {
  topChunks: RRFChunkResult[];
  onClose: () => void;
  onOpenCitation: (citation: ManualCitation) => void;
}

export function RrfInspector({ topChunks, onClose, onOpenCitation }: RrfInspectorProps) {
  const dialogRef = useDialog(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-950/80" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rrf-inspector-title"
        tabIndex={-1}
        className="relative w-full max-w-4xl bg-white border-2 border-slate-900 rounded-t-2xl sm:rounded-lg shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between gap-3 border-b-2 border-amber-500">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-amber-500 text-slate-950 rounded shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                Dense + BM25 hybrid retrieval
              </span>
              <h3 id="rrf-inspector-title" className="text-base sm:text-lg font-black truncate">
              Reciprocal rank fusion (top 6)
            </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-md bg-slate-800"
            aria-label="Close inspector"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="bg-slate-100 p-3 sm:px-6 border-b border-slate-200 text-xs text-slate-700">
          RRF(d) = 1/(60 + DenseRank) + 1/(60 + KeywordRank). Only these chunks go to generation.
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {topChunks.length === 0 && <p className="text-sm text-slate-600">No chunks were retrieved for this query.</p>}
          {topChunks.map((tc, idx) => (
            <div key={tc.chunk.id || idx} className="p-4 bg-slate-50 border-2 border-slate-200 rounded-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-slate-950">
                    #{idx + 1} {tc.chunk.documentName}
                  </h4>
                  <span className="text-xs text-slate-600">
                    Page {tc.chunk.pageNumber} • {tc.chunk.sectionTitle}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  <span className="bg-white border px-2 py-1 rounded">Dense #{tc.denseRank} ({tc.denseScore})</span>
                  <span className="bg-white border px-2 py-1 rounded">BM25 #{tc.keywordRank} ({tc.keywordScore})</span>
                  <span className="bg-amber-100 border border-amber-300 px-2 py-1 rounded font-bold">RRF {tc.rrfScore}</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 line-clamp-3 bg-white p-3 border rounded font-mono">{tc.chunk.text}</p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    onOpenCitation({
                      documentName: tc.chunk.documentName,
                      pageNumber: tc.chunk.pageNumber,
                      passageSnippet: tc.chunk.text.slice(0, 300),
                      chunkId: tc.chunk.id,
                    })
                  }
                  className="min-h-[48px] px-3.5 bg-slate-200 rounded text-xs font-bold flex items-center gap-1.5"
                >
                  View full chunk
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
