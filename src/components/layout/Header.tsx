import { Database, LayoutDashboard, Loader2, ShieldCheck, Wrench } from 'lucide-react';
import type { AppView } from '../../lib/persistence';

interface HeaderProps {
  view: AppView;
  totalChunks: number;
  healthLoading: boolean;
  onChangeView: (view: AppView) => void;
}

export function Header({ view, totalChunks, healthLoading, onChangeView }: HeaderProps) {
  return (
    <header className="w-full bg-slate-900 text-slate-50 border-b-4 border-amber-500 shadow-md pt-[env(safe-area-inset-top)]">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 shrink-0 bg-amber-500 text-slate-950 flex items-center justify-center rounded font-mono font-black text-xl tracking-wider">
            FN
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase font-mono">Fieldnote AI</h1>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded border border-amber-500/40">
                Grounded RRF
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium hidden xs:block sm:block">
              HVACR technician 90-second operational answer engine
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <div className="hidden lg:flex items-center gap-2 text-xs bg-slate-800 px-3 py-2 rounded border border-slate-700 text-slate-200">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Library only</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs bg-slate-800 px-3 py-2 rounded border border-slate-700 text-slate-200 col-span-2">
            {healthLoading ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Database className="w-4 h-4 text-amber-400" />}
            <span>{totalChunks} chunks</span>
          </div>

          <button
            type="button"
            onClick={() => onChangeView('field')}
            className={`min-h-[48px] px-3 sm:px-4 py-2 rounded font-bold text-sm flex items-center justify-center gap-2 border-2 ${
              view === 'field'
                ? 'bg-amber-500 border-amber-600 text-slate-950'
                : 'bg-slate-800 border-slate-700 text-white'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Field
          </button>
          <button
            type="button"
            onClick={() => onChangeView('admin')}
            className={`min-h-[48px] px-3 sm:px-4 py-2 rounded font-bold text-sm flex items-center justify-center gap-2 border-2 ${
              view === 'admin'
                ? 'bg-amber-500 border-amber-600 text-slate-950'
                : 'bg-slate-800 border-slate-700 text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Admin
          </button>
        </div>
      </div>
    </header>
  );
}
