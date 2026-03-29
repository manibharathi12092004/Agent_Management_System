import { Skeleton } from '../../../components/ui/Skeleton';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function DryRunPanel({ results = [], loading = false }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5 rounded-full" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-16 ml-auto" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) return null;

  return (
    <div className="space-y-3">
      {results.map((result) => {
        const hasError = !!result.error;
        return (
          <div
            key={result.step_order}
            className={`border rounded-lg p-3 space-y-2 ${
              hasError ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'
            }`}
          >
            {/* Header */}
            <div className="flex items-center gap-2">
              {hasError
                ? <XCircle size={15} className="text-red-500 flex-shrink-0" />
                : <CheckCircle size={15} className="text-emerald-500 flex-shrink-0" />
              }
              <span className="text-xs font-semibold text-gray-700">
                Step {result.step_order} — {result.agent_name}
              </span>
              <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                <Clock size={11} />
                {result.duration_ms}ms
              </span>
            </div>

            {/* Error badge */}
            {hasError && (
              <p className="text-xs text-red-600 bg-red-100 rounded px-2 py-1">
                {result.error}
              </p>
            )}

            {/* Output */}
            {result.output && (
              <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                {result.output}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
