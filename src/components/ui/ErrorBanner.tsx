import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ title = 'Something went wrong', message, onRetry }: ErrorBannerProps) {
  return (
    <div className="p-4 bg-red-50 border-2 border-red-500 rounded-md text-red-950 flex items-start gap-3" role="alert">
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm">{title}</h4>
        <p className="text-sm break-words">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[48px] px-3 bg-white border-2 border-red-400 rounded-md font-bold text-xs flex items-center gap-1.5 shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  );
}
