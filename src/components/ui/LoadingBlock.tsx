import { Loader2 } from 'lucide-react';

interface LoadingBlockProps {
  label: string;
}

export function LoadingBlock({ label }: LoadingBlockProps) {
  return (
    <div className="p-4 border-2 border-amber-400 bg-amber-50 rounded-md flex items-center gap-3 text-slate-900" role="status">
      <Loader2 className="w-5 h-5 animate-spin text-amber-700" />
      <span className="text-sm font-bold">{label}</span>
    </div>
  );
}
