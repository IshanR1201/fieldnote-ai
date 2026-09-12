import { Clock } from 'lucide-react';

export function FieldRibbon() {
  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-300 py-2 px-3 sm:px-4 text-[11px] sm:text-xs font-mono">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>90-SEC OPEN-UNIT SLA</span>
          <span className="text-slate-400 font-normal hidden sm:inline">
            | Baseline: 34 min unproductive search, 22% callbacks
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-300">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Grounded retrieval only</span>
          </span>
          <span className="hidden md:inline text-slate-400">Abstain rather than guess</span>
        </div>
      </div>
    </div>
  );
}
