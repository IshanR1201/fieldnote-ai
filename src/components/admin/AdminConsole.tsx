import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';
import { BookOpen, CheckCircle2, Loader2, PlusCircle, Upload } from 'lucide-react';
import { fetchAdminStats, ingestManual } from '../../lib/api';
import type { AdminTab, IngestDraft } from '../../lib/persistence';
import { hasErrors, validateIngestForm, type FieldErrors } from '../../lib/validation';
import type { LibraryGap, ManualDocument, UsageStats } from '../../types';
import { ErrorBanner } from '../ui/ErrorBanner';
import { FieldError } from '../ui/FieldError';
import { LoadingBlock } from '../ui/LoadingBlock';

interface AdminConsoleProps {
  onLibraryChanged: () => void;
  tab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  ingestDraft: IngestDraft;
  onIngestDraftChange: (draft: IngestDraft) => void;
}

export function AdminConsole({
  onLibraryChanged,
  tab,
  onTabChange,
  ingestDraft,
  onIngestDraftChange,
}: AdminConsoleProps) {
  const [manuals, setManuals] = useState<ManualDocument[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [gaps, setGaps] = useState<LibraryGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [fileError, setFileError] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    setLoadError(null);
    fetchAdminStats()
      .then((data) => {
        setManuals(data.manuals);
        setTotalChunks(data.totalChunks);
        setUsage(data.usage);
        setGaps(data.gaps);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Could not load admin stats.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, []);

  const updateDraft = (patch: Partial<IngestDraft>) => {
    onIngestDraftChange({ ...ingestDraft, ...patch });
  };

  const submitIngest = async () => {
    const errors = validateIngestForm(ingestDraft);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setIsIngesting(true);
    setIngestMessage(null);
    setIngestError(null);
    try {
      const data = await ingestManual({
        documentName: ingestDraft.documentName.trim(),
        brand: ingestDraft.brand.trim(),
        model: ingestDraft.model.trim(),
        text: ingestDraft.manualText,
      });
      setIngestMessage(data.message);
      onIngestDraftChange({ documentName: '', brand: '', model: '', manualText: '' });
      setFieldErrors({});
      reload();
      onLibraryChanged();
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : 'Ingestion failed');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleIngest = async (e: FormEvent) => {
    e.preventDefault();
    await submitIngest();
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      setFileError('Text files must be under 2 MB.');
      return;
    }
    if (!/\.(txt|md)$/i.test(file.name)) {
      setFileError('Upload a .txt or .md file.');
      return;
    }
    setFileError(null);
    if (!ingestDraft.documentName) updateDraft({ documentName: file.name.replace(/\.[^/.]+$/, '') });
    const reader = new FileReader();
    reader.onerror = () => setFileError('Could not read that file.');
    reader.onload = (event) => updateDraft({ manualText: String(event.target?.result || '') });
    reader.readAsText(file);
  };

  const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
  const inputClass = (hasError: boolean) =>
    `field-input w-full min-h-[48px] px-3 border-2 rounded-md font-semibold ${
      hasError ? 'border-red-500' : 'border-slate-300'
    }`;

  return (
    <section className="bg-white border-2 border-slate-900 rounded-lg overflow-hidden">
      <div className="bg-slate-900 text-white px-3 sm:px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">Administrator console</p>
          <h2 className="text-base sm:text-lg font-black">Library, usage, and documentation gaps</h2>
        </div>
        <span className="text-xs font-mono text-slate-300">{totalChunks} indexed chunks</span>
      </div>

      <div className="flex border-b border-slate-300 bg-slate-100 overflow-x-auto">
        {(
          [
            ['library', 'Library'],
            ['usage', 'Usage'],
            ['gaps', 'Library gaps'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`flex-1 min-w-[7rem] min-h-[48px] px-3 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap ${
              tab === id ? 'border-amber-500 bg-white text-slate-950' : 'border-transparent text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-3 sm:p-6 space-y-6">
        {loading && <LoadingBlock label="Loading admin data…" />}
        {loadError && <ErrorBanner title="Admin data unavailable" message={loadError} onRetry={reload} />}

        {tab === 'library' && !loading && (
          <>
            <div className="overflow-x-auto border-2 border-slate-200 rounded-md -mx-1">
              <table className="w-full text-sm text-left min-w-[32rem]">
                <thead className="bg-slate-100 text-xs uppercase font-black text-slate-700">
                  <tr>
                    <th className="p-3">Document</th>
                    <th className="p-3">Brand</th>
                    <th className="p-3">Pages</th>
                    <th className="p-3">Chunks</th>
                  </tr>
                </thead>
                <tbody>
                  {manuals.map((man) => (
                    <tr key={man.id} className="border-t border-slate-200">
                      <td className="p-3 font-semibold">{man.documentName}</td>
                      <td className="p-3 font-mono">
                        {man.brand} {man.model}
                      </td>
                      <td className="p-3">{man.totalPages}</td>
                      <td className="p-3">{man.totalChunks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form noValidate onSubmit={handleIngest} className="space-y-4 border-2 border-slate-200 rounded-md p-4">
              <h3 className="font-black text-slate-950 flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-600" />
                Upload new manual text
              </h3>
              <p className="text-xs text-slate-600">Drafts are saved in this browser, so a refresh will not wipe a half-written ingest.</p>
              {ingestMessage && (
                <p className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {ingestMessage}
                </p>
              )}
              {ingestError && <ErrorBanner title="Ingest failed" message={ingestError} onRetry={() => void submitIngest()} />}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <input
                    value={ingestDraft.documentName}
                    onChange={(e) => updateDraft({ documentName: e.target.value })}
                    placeholder="Document title"
                    aria-invalid={Boolean(fieldErrors.documentName)}
                    className={inputClass(Boolean(fieldErrors.documentName))}
                  />
                  <FieldError message={fieldErrors.documentName} />
                </div>
                <div>
                  <input
                    value={ingestDraft.brand}
                    onChange={(e) => updateDraft({ brand: e.target.value })}
                    placeholder="Brand"
                    aria-invalid={Boolean(fieldErrors.brand)}
                    className={inputClass(Boolean(fieldErrors.brand))}
                  />
                  <FieldError message={fieldErrors.brand} />
                </div>
                <div>
                  <input
                    value={ingestDraft.model}
                    onChange={(e) => updateDraft({ model: e.target.value })}
                    placeholder="Model"
                    aria-invalid={Boolean(fieldErrors.model)}
                    className={inputClass(Boolean(fieldErrors.model))}
                  />
                  <FieldError message={fieldErrors.model} />
                </div>
              </div>
              <label className="text-xs font-bold text-amber-700 cursor-pointer inline-flex min-h-[48px] items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                Attach .txt file
                <input type="file" accept=".txt,.md" onChange={handleFile} className="hidden" />
              </label>
              <FieldError message={fileError || undefined} />
              <textarea
                rows={6}
                value={ingestDraft.manualText}
                onChange={(e) => updateDraft({ manualText: e.target.value })}
                placeholder="Paste manual text. Use --- Page 12 --- markers to keep page citations."
                aria-invalid={Boolean(fieldErrors.manualText)}
                className={`field-input w-full p-3 border-2 rounded-md font-mono text-sm ${
                  fieldErrors.manualText ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              <p className="text-xs text-slate-500">{ingestDraft.manualText.trim().length} characters (50 minimum)</p>
              <FieldError message={fieldErrors.manualText} />
              <button
                type="submit"
                disabled={isIngesting}
                className="min-h-[48px] w-full sm:w-auto px-5 bg-amber-500 border-2 border-amber-600 rounded-md font-black text-sm flex items-center justify-center gap-2"
              >
                {isIngesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                {isIngesting ? 'Chunking & embedding…' : 'Ingest & embed'}
              </button>
            </form>
          </>
        )}

        {tab === 'usage' && !loading && usage && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Questions asked" value={String(usage.totalQuestions)} />
            <Stat label="Answer rate" value={pct(usage.answerRate)} />
            <Stat label="Refusal rate" value={pct(usage.refusalRate)} />
            <Stat label="Thumbs-down rate" value={pct(usage.thumbsDownRate)} />
          </div>
        )}

        {tab === 'gaps' && !loading && (
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              Escalations grouped by brand and model, ranked by frequency. This is documentation the contractor is missing.
            </p>
            {gaps.length === 0 && <p className="text-sm text-slate-500">No escalations yet.</p>}
            {gaps.map((gap) => (
              <div key={`${gap.brand}-${gap.model}`} className="p-4 border-2 border-slate-200 rounded-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="font-black text-slate-950">
                    {gap.brand} {gap.model}
                  </h3>
                  <span className="font-mono text-xs bg-amber-100 px-2 py-1 rounded font-bold w-fit">{gap.count} escalations</span>
                </div>
                <p className="text-sm text-slate-700 mt-1">{gap.latestQuestion}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-md">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-2xl font-black text-slate-950 mt-1">{value}</p>
    </div>
  );
}
