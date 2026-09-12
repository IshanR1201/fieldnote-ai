import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Clock, Cpu, FileSearch, HelpCircle, Loader2, Mic, MicOff, Search } from 'lucide-react';
import { FIELD_PRESETS, type FieldPreset } from '../../data/presets';
import { FieldError } from '../ui/FieldError';
import type { FieldErrors } from '../../lib/validation';

interface EquipmentQueryFormProps {
  brand: string;
  setBrand: (val: string) => void;
  model: string;
  setModel: (val: string) => void;
  question: string;
  setQuestion: (val: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  fieldErrors: FieldErrors;
  onSelectPreset: (preset: FieldPreset) => void;
}

export function EquipmentQueryForm({
  brand,
  setBrand,
  model,
  setModel,
  question,
  setQuestion,
  onSubmit,
  isLoading,
  fieldErrors,
  onSelectPreset,
}: EquipmentQueryFormProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pipelineStage, setPipelineStage] = useState<'retrieval' | 'generation'>('retrieval');
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (!isLoading) {
      setElapsedSeconds(0);
      setPipelineStage('retrieval');
      return;
    }
    setElapsedSeconds(0);
    setPipelineStage('retrieval');
    const startTime = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setElapsedSeconds(elapsed);
      if (elapsed >= 1.3) setPipelineStage('generation');
    }, 100);
    return () => window.clearInterval(interval);
  }, [isLoading]);

  const toggleVoice = () => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceError('Voice input is not supported in this browser. Use Chrome or Edge with a microphone.');
      return;
    }
    setVoiceError(null);
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      if (transcript) setQuestion(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setVoiceError('Could not capture voice. Check microphone permission and try again.');
    };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const inputClass = (hasError: boolean) =>
    `field-input w-full min-h-[48px] px-3.5 py-2.5 bg-slate-50 border-2 rounded-md font-semibold text-slate-950 placeholder:text-slate-400 focus:bg-white focus:outline-none ${
      hasError ? 'border-red-500' : 'border-slate-300 focus:border-amber-500'
    }`;

  return (
    <section className="bg-white border-2 border-slate-300 rounded-lg p-3 sm:p-6 shadow-sm">
      <div className="mb-5">
        <label className="text-xs font-black tracking-wider uppercase text-slate-700 mb-2.5 block">
          Field presets (one-tap diagnostic scenarios)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {FIELD_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`min-h-[52px] text-left p-3 rounded-md border-2 transition-all ${
                preset.isRefusalTest
                  ? 'border-dashed border-amber-400 bg-amber-50/50'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-start sm:items-center justify-between gap-1 w-full">
                <span className="font-bold text-sm text-slate-950 leading-snug">{preset.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                    preset.isRefusalTest ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {preset.badge}
                </span>
              </div>
              <span className="text-xs text-slate-600 line-clamp-2 mt-0.5 block">{preset.question}</span>
            </button>
          ))}
        </div>
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="field-brand" className="block text-xs font-black uppercase tracking-wider text-slate-800 mb-1.5">
              Equipment brand
            </label>
            <input
              id="field-brand"
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              aria-invalid={Boolean(fieldErrors.brand)}
              aria-describedby={fieldErrors.brand ? 'brand-error' : undefined}
              placeholder="e.g. Carrier, Trane, Copeland"
              className={inputClass(Boolean(fieldErrors.brand))}
            />
            <FieldError id="brand-error" message={fieldErrors.brand} />
          </div>
          <div>
            <label htmlFor="field-model" className="block text-xs font-black uppercase tracking-wider text-slate-800 mb-1.5">
              Model number / series
            </label>
            <input
              id="field-model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              aria-invalid={Boolean(fieldErrors.model)}
              aria-describedby={fieldErrors.model ? 'model-error' : undefined}
              placeholder="e.g. 59MN7A or 59-MN7A"
              className={inputClass(Boolean(fieldErrors.model))}
            />
            <FieldError id="model-error" message={fieldErrors.model} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label htmlFor="field-question" className="block text-xs font-black uppercase tracking-wider text-slate-800">
              Diagnostic question / fault code
            </label>
            <button
              type="button"
              onClick={toggleVoice}
              className={`min-h-[48px] min-w-[48px] px-3 rounded-md border-2 font-bold text-xs flex items-center gap-2 shrink-0 ${
                listening ? 'bg-amber-500 border-amber-600 text-slate-950' : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span className="hidden sm:inline">{listening ? 'Stop' : 'Voice'}</span>
            </button>
          </div>
          <textarea
            id="field-question"
            rows={4}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isLoading}
            aria-invalid={Boolean(fieldErrors.question)}
            aria-describedby={fieldErrors.question ? 'question-error' : undefined}
            placeholder="Standing in front of the unit: enter the fault code, LED flash count, or required DIP switch spec..."
            className={`field-input w-full min-h-[96px] p-3.5 bg-slate-50 border-2 rounded-md text-slate-950 placeholder:text-slate-400 focus:outline-none leading-relaxed ${
              fieldErrors.question
                ? 'border-red-500'
                : isLoading
                  ? 'border-amber-500 bg-amber-50/20'
                  : 'border-slate-300 focus:border-amber-500'
            }`}
          />
          <p className="mt-1 text-xs text-slate-500">{question.trim().length}/500</p>
          <FieldError id="question-error" message={fieldErrors.question} />
          <FieldError message={voiceError || undefined} />
        </div>

        {isLoading && (
          <div className="p-3 sm:p-4 bg-slate-950 border-2 border-amber-500 rounded-md text-slate-100 space-y-3" role="status">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <span className="text-[11px] sm:text-xs font-black font-mono uppercase tracking-wider text-amber-400">
                Pipeline active
              </span>
              <span className="font-mono text-xs text-amber-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {elapsedSeconds.toFixed(1)}s
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
              <StageCard
                title="Stage 1: Retrieval"
                icon={<FileSearch className="w-3.5 h-3.5" />}
                active={pipelineStage === 'retrieval'}
                done={pipelineStage === 'generation'}
                activeCopy="Embedding question, scoring chunks with cosine + BM25, then RRF..."
                doneCopy="Top 6 chunks ranked. Checking 0.35 confidence threshold."
              />
              <StageCard
                title="Stage 2: Generation"
                icon={<Cpu className="w-3.5 h-3.5" />}
                active={pipelineStage === 'generation'}
                done={false}
                queued={pipelineStage === 'retrieval'}
                activeCopy="Writing numbered steps from retrieved passages only..."
                doneCopy="Awaiting ranking."
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 sticky bottom-2 sm:static">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
            <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>Dense cosine + BM25 fused with RRF (k=60).</span>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="min-h-[52px] w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-black text-base rounded-md border-2 border-amber-600 disabled:border-slate-300 flex items-center justify-center gap-2.5 shadow-lg sm:shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{pipelineStage === 'retrieval' ? 'Retrieving chunks...' : 'Generating grounded steps...'}</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5 stroke-[2.5]" />
                <span>Query service manual</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

function StageCard({
  title,
  icon,
  active,
  done,
  queued,
  activeCopy,
  doneCopy,
}: {
  title: string;
  icon: ReactNode;
  active: boolean;
  done: boolean;
  queued?: boolean;
  activeCopy: string;
  doneCopy: string;
}) {
  return (
    <div
      className={`p-3 rounded border ${
        active
          ? 'bg-amber-950/50 border-amber-500 text-amber-200'
          : done
            ? 'bg-emerald-950/40 border-emerald-600/70 text-emerald-300'
            : 'bg-slate-900/80 border-slate-800 text-slate-400'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
          {icon}
          {title}
        </span>
        {active ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : done ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
      </div>
      <p className="text-[11px] leading-snug font-sans">{queued ? doneCopy : active || done ? (active ? activeCopy : doneCopy) : doneCopy}</p>
    </div>
  );
}
