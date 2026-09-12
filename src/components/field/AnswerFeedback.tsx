import { useEffect, useState } from 'react';
import { Check, Copy, Loader2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { submitFeedback } from '../../lib/api';
import { validateFeedbackNote } from '../../lib/validation';
import { FieldError } from '../ui/FieldError';
import type { FeedbackDraft } from '../../lib/persistence';
import type { QueryResponse } from '../../types';

interface AnswerFeedbackProps {
  response: QueryResponse;
  brand: string;
  model: string;
  question: string;
  savedFeedback?: FeedbackDraft;
  onFeedbackSaved: (draft: FeedbackDraft) => void;
}

export function AnswerFeedback({
  response,
  brand,
  model,
  question,
  savedFeedback,
  onFeedbackSaved,
}: AnswerFeedbackProps) {
  const [rating, setRating] = useState<'up' | 'down' | null>(savedFeedback?.rating ?? null);
  const [note, setNote] = useState(savedFeedback?.note ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(savedFeedback?.rating ? 'saved' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  useEffect(() => {
    setRating(savedFeedback?.rating ?? null);
    setNote(savedFeedback?.note ?? '');
    setStatus(savedFeedback?.rating ? 'saved' : 'idle');
    setError(null);
    setNoteError(null);
  }, [response.queryId, savedFeedback?.rating, savedFeedback?.note]);

  const save = async (nextRating: 'up' | 'down') => {
    const invalidNote = validateFeedbackNote(note);
    setNoteError(invalidNote);
    if (invalidNote) return;
    setRating(nextRating);
    setStatus('saving');
    setError(null);
    try {
      await submitFeedback({
        queryId: response.queryId,
        rating: nextRating,
        note,
        question,
        brand,
        model,
        chunkIds: response.topChunks.map((c) => c.chunk.id),
        answerStatus: response.status,
        procedureSteps: response.procedureSteps,
      });
      setStatus('saved');
      onFeedbackSaved({ rating: nextRating, note });
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not save rating');
    }
  };

  return (
    <div className="pt-5 border-t border-slate-200 space-y-3">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">Was this procedure usable on the job?</p>
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => save('up')}
          disabled={status === 'saving'}
          className={`min-h-[48px] px-4 rounded-md border-2 font-bold text-sm flex items-center justify-center gap-2 ${
            rating === 'up' ? 'bg-emerald-100 border-emerald-600 text-emerald-950' : 'bg-white border-slate-300 text-slate-800'
          }`}
        >
          <ThumbsUp className="w-4 h-4" />
          Thumbs up
        </button>
        <button
          type="button"
          onClick={() => save('down')}
          disabled={status === 'saving'}
          className={`min-h-[48px] px-4 rounded-md border-2 font-bold text-sm flex items-center justify-center gap-2 ${
            rating === 'down' ? 'bg-red-100 border-red-500 text-red-950' : 'bg-white border-slate-300 text-slate-800'
          }`}
        >
          <ThumbsDown className="w-4 h-4" />
          Thumbs down
        </button>
        {status === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-slate-500 col-span-2" />}
        {status === 'saved' && <span className="text-xs font-bold text-emerald-700 col-span-2">Saved. This rating survives a refresh.</span>}
      </div>
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setNoteError(validateFeedbackNote(e.target.value));
        }}
        maxLength={500}
        placeholder="Optional note (wrong page, missing step, unsafe instruction...)"
        rows={2}
        className={`field-input w-full p-3 bg-slate-50 border-2 rounded-md text-slate-950 focus:outline-none ${
          noteError ? 'border-red-500' : 'border-slate-300 focus:border-amber-500'
        }`}
      />
      <p className="text-xs text-slate-500">{note.trim().length}/500</p>
      <FieldError message={noteError || undefined} />
      {rating && note && status !== 'saving' && (
        <button
          type="button"
          onClick={() => save(rating)}
          className="min-h-[48px] w-full sm:w-auto px-4 bg-slate-900 text-white rounded-md font-bold text-sm"
        >
          Update note
        </button>
      )}
      {error && <FieldError message={error} />}
    </div>
  );
}
