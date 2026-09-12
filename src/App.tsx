import { useEffect, useState } from 'react';
import { Header } from './components/layout/Header';
import { FieldRibbon } from './components/layout/FieldRibbon';
import { EquipmentQueryForm } from './components/field/EquipmentQueryForm';
import { ProcedureAnswerView } from './components/field/ProcedureAnswerView';
import { PassageModal } from './components/field/PassageModal';
import { RrfInspector } from './components/field/RrfInspector';
import { EmptyState } from './components/field/EmptyState';
import { AdminConsole } from './components/admin/AdminConsole';
import { ErrorBanner } from './components/ui/ErrorBanner';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ApiError, fetchHealth, runQuery } from './lib/api';
import { findCachedAnswer } from './lib/offlineCache';
import {
  DEFAULT_SESSION,
  loadSession,
  persistAnswer,
  persistSession,
  type AnsweredFor,
  type AppView,
  type SessionState,
} from './lib/persistence';
import { hasErrors, validateQueryForm, type FieldErrors } from './lib/validation';
import type { FieldPreset } from './data/presets';
import type { ManualCitation, QueryResponse } from './types';

export default function App() {
  const initial = loadSession();
  const [view, setView] = useState<AppView>(initial.view);
  const [brand, setBrand] = useState(initial.brand);
  const [model, setModel] = useState(initial.model);
  const [question, setQuestion] = useState(initial.question);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [queryResponse, setQueryResponse] = useState<QueryResponse | null>(initial.lastResponse);
  const [answeredFor, setAnsweredFor] = useState<AnsweredFor | null>(initial.answeredFor);
  const [activeCitation, setActiveCitation] = useState<ManualCitation | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [totalChunks, setTotalChunks] = useState(0);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [restored, setRestored] = useState(Boolean(initial.lastResponse));
  const [servedFromCache, setServedFromCache] = useState(false);
  const [ingestDraft, setIngestDraft] = useState(initial.ingestDraft);
  const [adminTab, setAdminTab] = useState(initial.adminTab);
  const [feedbackByQueryId, setFeedbackByQueryId] = useState(initial.feedbackByQueryId);

  const refreshHealth = () => {
    setHealthLoading(true);
    fetchHealth()
      .then((data) => {
        setTotalChunks(data.totalChunks || 0);
        setHealthError(null);
      })
      .catch((err) => {
        setHealthError(err instanceof Error ? err.message : 'Could not reach the API.');
      })
      .finally(() => setHealthLoading(false));
  };

  useEffect(() => {
    refreshHealth();
  }, []);

  // The cached-copy notice must not outlive the outage it describes.
  useEffect(() => {
    const handleOnline = () => {
      setServedFromCache(false);
      refreshHealth();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => {
    const next: SessionState = {
      ...DEFAULT_SESSION,
      view,
      brand,
      model,
      question,
      lastResponse: queryResponse,
      answeredFor,
      adminTab,
      ingestDraft,
      feedbackByQueryId,
    };
    persistSession(next);
  }, [view, brand, model, question, queryResponse, answeredFor, adminTab, ingestDraft, feedbackByQueryId]);

  /**
   * A displayed procedure must never look like the answer to a question it was not
   * retrieved for, so the answer is flagged whenever the form no longer matches it.
   */
  const isAnswerStale = Boolean(
    queryResponse &&
      answeredFor &&
      (answeredFor.question !== question.trim() ||
        answeredFor.brand !== brand.trim() ||
        answeredFor.model !== model.trim()),
  );

  const handleRunQuery = async () => {
    if (isLoading) return;

    const errors = validateQueryForm({ brand, model, question });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    const submitted: AnsweredFor = { brand: brand.trim(), model: model.trim(), question: question.trim() };
    setIsLoading(true);
    setError(null);
    setRestored(false);
    setServedFromCache(false);
    try {
      const data = await runQuery(submitted);
      setQueryResponse(data);
      setAnsweredFor(submitted);
      persistAnswer({ ...submitted, response: data });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to query service manuals.';
      // With no connection, a previously retrieved answer for this exact question is
      // still trustworthy, so it beats leaving the technician with only an error.
      if (err instanceof ApiError && err.isNetworkError) {
        const cached = findCachedAnswer(submitted.brand, submitted.model, submitted.question);
        if (cached) {
          setQueryResponse(cached.response);
          setAnsweredFor(submitted);
          setServedFromCache(true);
          setError(null);
          return;
        }
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (preset: FieldPreset) => {
    setBrand(preset.brand);
    setModel(preset.model);
    setQuestion(preset.question);
    setError(null);
    setRestored(false);
    setFieldErrors({});
  };

  return (
    <ErrorBoundary>
      <div className="app-shell min-h-dvh bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-amber-200">
        <Header
          view={view}
          totalChunks={totalChunks}
          healthLoading={healthLoading}
          onChangeView={(next) => {
            setView(next);
            setServedFromCache(false);
          }}
        />
        <FieldRibbon />

        <main className="flex-1 max-w-6xl w-full mx-auto px-3 py-4 sm:p-6 space-y-4 sm:space-y-6 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {healthError && (
            <ErrorBanner title="API unavailable" message={healthError} onRetry={refreshHealth} />
          )}
          {restored && queryResponse && (
            <p className="text-xs sm:text-sm font-bold text-slate-700 bg-white border-2 border-slate-300 rounded-md px-3 py-2">
              Restored your last question and answer after refresh.
            </p>
          )}
          {servedFromCache && (
            <p
              role="status"
              className="text-xs sm:text-sm font-bold text-slate-900 bg-amber-100 border-2 border-amber-600 rounded-md px-3 py-2"
            >
              No connection. Showing the saved copy of this answer from your last successful
              retrieval.
            </p>
          )}

          {view === 'admin' ? (
            <AdminConsole
              onLibraryChanged={refreshHealth}
              tab={adminTab}
              onTabChange={setAdminTab}
              ingestDraft={ingestDraft}
              onIngestDraftChange={setIngestDraft}
            />
          ) : (
            <>
              <EquipmentQueryForm
                brand={brand}
                setBrand={(value) => {
                  setBrand(value);
                  setRestored(false);
                  setFieldErrors((prev) => ({ ...prev, brand: '' }));
                }}
                model={model}
                setModel={(value) => {
                  setModel(value);
                  setRestored(false);
                  setFieldErrors((prev) => ({ ...prev, model: '' }));
                }}
                question={question}
                setQuestion={(value) => {
                  setQuestion(value);
                  setRestored(false);
                  setFieldErrors((prev) => ({ ...prev, question: '' }));
                }}
                onSubmit={handleRunQuery}
                isLoading={isLoading}
                fieldErrors={fieldErrors}
                onSelectPreset={handleSelectPreset}
              />

              {error && (
                <ErrorBanner title="Diagnostic error" message={error} onRetry={handleRunQuery} />
              )}

              {queryResponse && (
                <ProcedureAnswerView
                  response={queryResponse}
                  answeredFor={answeredFor}
                  isStale={isAnswerStale}
                  onOpenCitation={setActiveCitation}
                  onOpenInspector={() => setIsInspectorOpen(true)}
                  savedFeedback={feedbackByQueryId[queryResponse.queryId]}
                  onFeedbackSaved={(draft) =>
                    setFeedbackByQueryId((prev) => ({ ...prev, [queryResponse.queryId]: draft }))
                  }
                />
              )}

              {!queryResponse && !isLoading && (
                <EmptyState totalChunks={totalChunks} onOpenAdmin={() => setView('admin')} />
              )}
            </>
          )}
        </main>

        <PassageModal citation={activeCitation} onClose={() => setActiveCitation(null)} />

        {isInspectorOpen && queryResponse && (
          <RrfInspector
            topChunks={queryResponse.topChunks}
            onClose={() => setIsInspectorOpen(false)}
            onOpenCitation={(citation) => {
              setIsInspectorOpen(false);
              setActiveCitation(citation);
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
