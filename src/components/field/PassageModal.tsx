import { useEffect, useState } from 'react';
import { BookOpen, Check, Copy, Loader2, ShieldCheck, X } from 'lucide-react';
import { fetchChunk } from '../../lib/api';
import { useDialog } from '../../lib/useDialog';
import type { ManualCitation, ManualChunk } from '../../types';
import { ErrorBanner } from '../ui/ErrorBanner';

interface PassageModalProps {
  citation: ManualCitation | null;
  onClose: () => void;
}

export function PassageModal({ citation, onClose }: PassageModalProps) {
  const [fullChunk, setFullChunk] = useState<ManualChunk | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChunk = () => {
    if (!citation?.chunkId) return;
    setLoading(true);
    setError(null);
    fetchChunk(citation.chunkId)
      .then((data) => setFullChunk(data.chunk))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the full passage.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!citation) return;
    setCopied(false);
    setFullChunk(null);
    setError(null);
    if (!citation.chunkId) return;
    loadChunk();
  }, [citation]);

  if (!citation) return null;

  return <PassageDialog citation={citation} onClose={onClose} fullChunk={fullChunk} loading={loading} error={error} onRetry={loadChunk} copied={copied} setCopied={setCopied} />;
}

interface PassageDialogProps {
  citation: ManualCitation;
  onClose: () => void;
  fullChunk: ManualChunk | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  copied: boolean;
  setCopied: (value: boolean) => void;
}

function PassageDialog({
  citation,
  onClose,
  fullChunk,
  loading,
  error,
  onRetry,
  copied,
  setCopied,
}: PassageDialogProps) {
  const dialogRef = useDialog(onClose);

  const handleCopy = () => {
    void navigator.clipboard?.writeText(fullChunk?.text || citation.passageSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-950/80" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="passage-modal-title"
        tabIndex={-1}
        className="relative w-full max-w-2xl bg-white border-2 border-slate-900 rounded-t-2xl sm:rounded-lg shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between gap-3 border-b-2 border-amber-500">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-amber-500 text-slate-950 rounded shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                Verified manufacturer citation
              </span>
              <h3
                id="passage-modal-title"
                className="text-base sm:text-lg font-black tracking-tight text-white truncate"
              >
                {citation.documentName}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-md bg-slate-800"
            aria-label="Close passage"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="bg-slate-100 px-4 sm:px-6 py-2.5 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs font-mono font-bold text-slate-700">
          <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded uppercase">Page {citation.pageNumber}</span>
          <span className="flex items-center gap-1 text-emerald-700">
            <ShieldCheck className="w-4 h-4" />
            Verbatim source
          </span>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          <div className="bg-amber-50/80 border-l-4 border-amber-500 p-4 rounded-r-md">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block mb-1">Cited passage</span>
            <p className="text-base sm:text-lg font-bold text-slate-950 leading-relaxed">&ldquo;{citation.passageSnippet}&rdquo;</p>
          </div>
          {loading && (
            <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading full chunk...
            </p>
          )}
          {error && <ErrorBanner title="Passage load failed" message={error} onRetry={onRetry} />}
          <div className="p-4 bg-slate-50 border border-slate-300 rounded-md text-sm sm:text-base text-slate-900 whitespace-pre-wrap leading-relaxed">
            {fullChunk?.text || citation.passageSnippet}
          </div>
        </div>
        <div className="p-4 bg-slate-100 border-t border-slate-300 flex items-center justify-between gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[48px] px-4 py-2 bg-white border border-slate-300 rounded font-semibold text-sm flex items-center gap-2"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" onClick={onClose} className="min-h-[48px] px-6 py-2 bg-slate-900 text-white rounded font-bold text-sm">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
