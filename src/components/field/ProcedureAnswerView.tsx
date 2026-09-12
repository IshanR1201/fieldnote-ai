import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck2,
  Layers,
  Loader2,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { createEscalation } from '../../lib/api';
import type { AnsweredFor, FeedbackDraft } from '../../lib/persistence';
import type { EscalationRecord, ManualCitation, ProcedureStep, QueryResponse } from '../../types';
import { AnswerFeedback } from './AnswerFeedback';
import { ErrorBanner } from '../ui/ErrorBanner';

interface ProcedureAnswerViewProps {
  response: QueryResponse;
  answeredFor: AnsweredFor | null;
  isStale: boolean;
  onOpenCitation: (citation: ManualCitation) => void;
  onOpenInspector: () => void;
  savedFeedback?: FeedbackDraft;
  onFeedbackSaved: (draft: FeedbackDraft) => void;
}

export function ProcedureAnswerView({
  response,
  answeredFor,
  isStale,
  onOpenCitation,
  onOpenInspector,
  savedFeedback,
  onFeedbackSaved,
}: ProcedureAnswerViewProps) {
  const isRefused = response.status === 'refused';
  // Escalations and feedback are tied to the inputs that produced the answer, not to
  // whatever is currently typed in the form.
  const answeredQuestion = answeredFor?.question || '';
  const displayBrand = response.stats?.brand || answeredFor?.brand || 'Unspecified';
  const displayModel = response.stats?.model || answeredFor?.model || 'Unspecified';
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalationError, setEscalationError] = useState<string | null>(null);
  const [pendingEscalation, setPendingEscalation] = useState<EscalationRecord | null>(null);

  useEffect(() => {
    setPendingEscalation(null);
    setEscalationError(null);
  }, [response.queryId]);

  const handleEscalate = async () => {
    if (isEscalating) return;
    setIsEscalating(true);
    setEscalationError(null);
    try {
      const data = await createEscalation({
        brand: displayBrand,
        model: displayModel,
        question: answeredQuestion,
        chunks: response.topChunks,
      });
      setPendingEscalation(data.escalation);
    } catch (err) {
      setEscalationError(err instanceof Error ? err.message : 'Error recording escalation');
    } finally {
      setIsEscalating(false);
    }
  };

  return (
    <section className="bg-white border-2 border-slate-900 rounded-lg shadow-md overflow-hidden">
      <div
        className={`px-3 sm:px-6 py-3 border-b-2 flex flex-wrap items-center justify-between gap-3 ${
          isRefused ? 'bg-amber-100 border-amber-500 text-amber-950' : 'bg-slate-900 border-slate-900 text-white'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isRefused ? <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" /> : <FileCheck2 className="w-5 h-5 text-amber-400 shrink-0" />}
          <span className="font-mono font-black text-xs sm:text-sm uppercase tracking-wider">
            {isRefused ? 'Abstention path' : 'Grounded procedure'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-white/20 truncate max-w-[40vw] sm:max-w-none">
            {response.equipmentMatch}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono w-full sm:w-auto">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {(response.latencyMs / 1000).toFixed(2)}s
          </span>
          <button
            type="button"
            onClick={onOpenInspector}
            className="min-h-[48px] flex-1 sm:flex-none px-3 py-1 bg-white/10 rounded font-semibold flex items-center justify-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Audit chunks ({response.topChunks.length})
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-6">
        {isStale && (
          <div
            role="alert"
            className="mb-4 bg-amber-100 border-2 border-amber-600 rounded-md p-3.5 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h4 className="text-sm font-black uppercase tracking-wider text-amber-950">
                Outdated result — do not follow yet
              </h4>
              <p className="text-sm font-bold text-slate-900 mt-1">
                You changed the equipment or question since this was retrieved. It still answers:
              </p>
              <p className="text-sm font-mono text-slate-800 mt-1 break-words">
                &ldquo;{answeredQuestion}&rdquo;
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1">
                Run <span className="font-black">Query service manual</span> again to refresh it.
              </p>
            </div>
          </div>
        )}

        {isRefused ? (
          pendingEscalation ? (
            <EscalationConfirmation record={pendingEscalation} />
          ) : (
            <div className="bg-amber-50 border-2 border-amber-600 rounded-md p-4 sm:p-6 space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-amber-200 text-amber-900 rounded-md shrink-0">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div className="space-y-2 min-w-0">
                  <span className="text-xs font-mono uppercase font-bold text-amber-800 tracking-wider block">
                    Grounded retrieval abstention
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-snug">
                    The manuals in your library do not cover this question.
                  </h3>
                  <p className="text-sm text-slate-800 font-medium">
                    Retrieval confidence fell below 0.35, so the generation model was not called.
                  </p>
                </div>
              </div>
              <div className="p-3.5 bg-white border-2 border-amber-300 rounded-md flex flex-wrap items-center gap-2 text-sm font-mono">
                <span className="bg-slate-100 border border-slate-300 px-2.5 py-1 rounded font-black">Brand: {displayBrand}</span>
                <span className="bg-slate-100 border border-slate-300 px-2.5 py-1 rounded font-black">Model: {displayModel}</span>
              </div>
              {escalationError && <ErrorBanner title="Escalation failed" message={escalationError} onRetry={handleEscalate} />}
              <button
                type="button"
                onClick={handleEscalate}
                disabled={isEscalating}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3 bg-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider rounded-md border-2 border-amber-600 flex items-center justify-center gap-2.5"
              >
                {isEscalating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Writing escalation...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-5 h-5" />
                    Escalate to senior technician
                  </>
                )}
              </button>
            </div>
          )
        ) : (
          <div className="space-y-6">
            {response.safetyCallout && (
              <div className="bg-amber-50 border-2 border-amber-600 rounded-md p-4 flex items-start gap-3">
                <div className="p-1.5 bg-amber-500 text-slate-950 rounded shrink-0">
                  <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-950">Safety callout</h4>
                  <p className="text-sm font-bold text-slate-950 mt-0.5">{response.safetyCallout}</p>
                </div>
              </div>
            )}
            <div className="space-y-3.5">
              {response.procedureSteps.map((step: ProcedureStep) => (
                <article key={step.stepNumber} className="p-3 sm:p-5 bg-slate-50 border-2 border-slate-200 rounded-md">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <span className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-slate-900 text-amber-400 font-mono font-black text-xl sm:text-2xl flex items-center justify-center rounded-md">
                      {step.stepNumber}
                    </span>
                    <div className="flex-1 space-y-3 min-w-0">
                      <p className="procedure-step font-bold text-slate-950 leading-[1.5] tracking-tight">{step.text}</p>
                      <button
                        type="button"
                        onClick={() => onOpenCitation(step.citation)}
                        className="min-h-[48px] w-full sm:w-auto px-3.5 py-2 bg-white text-slate-900 border-2 border-amber-500 rounded-md text-xs sm:text-sm font-bold flex items-center gap-2"
                      >
                        <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="truncate text-left">
                          {step.citation.documentName}, p. {step.citation.pageNumber}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-auto" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="pt-2 text-xs text-slate-600 font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {response.procedureSteps.length} cited steps • RRF {response.stats.topRrfScore.toFixed(4)}
            </div>
          </div>
        )}

        <AnswerFeedback
          response={response}
          brand={displayBrand}
          model={displayModel}
          question={answeredQuestion}
          savedFeedback={savedFeedback}
          onFeedbackSaved={onFeedbackSaved}
        />
      </div>
    </section>
  );
}

function EscalationConfirmation({ record }: { record: EscalationRecord }) {
  return (
    <div className="bg-emerald-50 border-2 border-emerald-600 rounded-md p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-md">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800 block">
              Escalation confirmed
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-950">Pending senior technician review</h3>
          </div>
        </div>
        <span className="px-3 py-1.5 bg-emerald-200 text-emerald-950 rounded font-mono font-black text-xs border border-emerald-400">
          {record.id}
        </span>
      </div>
      <div className="p-4 bg-white border-2 border-emerald-200 rounded-md text-sm space-y-2">
        <p>
          <strong>Brand:</strong> {record.brand} &nbsp; <strong>Model:</strong> {record.model}
        </p>
        <p>
          <strong>Question:</strong> {record.question}
        </p>
        <p className="text-xs font-mono text-slate-600">
          Logged {new Date(record.timestamp).toLocaleString()} • {record.retrievedChunks.length} chunks attached
        </p>
      </div>
    </div>
  );
}
