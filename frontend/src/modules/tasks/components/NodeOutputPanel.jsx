import { X, Bot, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { parseMarkdown } from '../../../utils/markdownParser';

export default function NodeOutputPanel({ node, onClose }) {
  if (!node) return null;

  const { type, data } = node;
  const isOutput = type === 'output';
  const isFailed = data?.status === 'failed';
  const hasOutput = !!data?.output;

  const title = isOutput
    ? 'Workflow Output'
    : (data?.label || data?.agentName || 'Agent Output');

  const headerCls = isOutput
    ? 'bg-emerald-500'
    : isFailed
      ? 'bg-red-500'
      : 'bg-indigo-500';

  return (
    <>
      {/* Backdrop — no blur, it corrupts React Flow SVG edge rendering */}
      <div
        className="fixed inset-0 bg-black/10 z-50"
        onClick={onClose}
      />

      {/* Centered modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[680px] max-w-[90vw] max-h-[80vh] bg-white rounded-2xl shadow-floating overflow-hidden flex flex-col animate-fade-in">

        {/* Header */}
        <div className={`${headerCls} px-6 py-4 flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              {isOutput
                ? <CheckCircle2 size={18} className="text-white" strokeWidth={2} />
                : isFailed
                  ? <XCircle size={18} className="text-white" strokeWidth={2} />
                  : <Bot size={18} className="text-white" strokeWidth={1.75} />
              }
            </div>
            <div>
              <p className="text-white font-semibold text-base">{title}</p>
              {data?.duration_ms && (
                <p className="text-white/70 text-xs flex items-center gap-1 mt-0.5">
                  <Clock size={11} /> {data.duration_ms}ms
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {hasOutput ? (
            isFailed ? (
              /* Error display */
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <div>
                  <p className="text-sm font-semibold text-red-800 mb-1">Execution Error</p>
                  <pre className="text-sm text-red-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {data.output}
                  </pre>
                </div>
              </div>
            ) : (
              /* Success output — rendered as formatted text */
              <div
                className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(data.output) }}
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Bot size={20} className="text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-gray-500">No output yet</p>
              <p className="text-xs text-gray-400 mt-1">Run the workflow to see results</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex-shrink-0 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {isOutput ? 'Final workflow output' : `Step output — ${data?.label || 'Agent'}`}
          </p>
          <button onClick={onClose} className="btn-secondary btn-sm">Close</button>
        </div>
      </div>
    </>
  );
}
