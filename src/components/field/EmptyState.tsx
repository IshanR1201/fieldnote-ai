import { ArrowUpRight, ShieldCheck } from 'lucide-react';

interface EmptyStateProps {
  totalChunks: number;
  onOpenAdmin: () => void;
}

export function EmptyState({ totalChunks, onOpenAdmin }: EmptyStateProps) {
  return (
    <section className="bg-white border-2 border-slate-900 rounded-lg p-4 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b-2 border-slate-200">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-amber-500 text-slate-950 rounded-md shadow-sm flex-shrink-0">
            <ShieldCheck className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-900 text-amber-400">
              Closed-domain retrieval
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 mt-1 tracking-tight">
              This tool only answers from the uploaded manual library.
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenAdmin}
          className="min-h-[48px] w-full sm:w-auto px-4 py-2.5 bg-slate-100 text-slate-900 border-2 border-slate-300 rounded-md text-sm font-bold flex items-center gap-2 justify-center"
        >
          <span>Open library ({totalChunks} chunks)</span>
          <ArrowUpRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>
      <p className="text-base sm:text-lg text-slate-800 font-medium leading-relaxed">
        Fieldnote answers only from manufacturer service manuals and never from general model knowledge. If the
        library does not cover the brand, model, or fault, it refuses and offers escalation to a senior technician.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <LibraryCard brand="Carrier" model="59MN7A Series" title="Condensing gas furnace" body="Fault 33 limit circuit, SW1 fan DIP switches, inducer pressure switches, flame sensor." />
        <LibraryCard brand="Trane" model="XR14 / XR16" title="Split-system heat pump" body="Defrost force test, 10k thermistor table, reversing valve solenoid." />
        <LibraryCard brand="Copeland" model="ZP-Scroll" title="Commercial scroll compressor" body="IPR valve trip, winding resistance, discharge line thermostat at 225°F." />
      </div>
    </section>
  );
}

function LibraryCard({
  brand,
  model,
  title,
  body,
}: {
  brand: string;
  model: string;
  title: string;
  body: string;
}) {
  return (
    <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-md space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono font-black text-xs text-amber-700 uppercase">{brand}</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 font-bold">{model}</span>
      </div>
      <h3 className="font-bold text-sm text-slate-950">{title}</h3>
      <p className="text-xs text-slate-600 leading-normal">{body}</p>
    </div>
  );
}
