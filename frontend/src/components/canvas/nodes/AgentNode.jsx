import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot, Loader2, CheckCircle2, XCircle, MinusCircle, Clock } from 'lucide-react';

function AgentNode({ data, selected }) {
  const { label, agentName, status = 'idle', duration_ms } = data;

  const styles = {
    idle:    { card: 'bg-white border-gray-200',         icon: 'bg-gray-50 text-gray-400',        dot: 'bg-gray-300',               sub: 'text-gray-400' },
    running: { card: 'bg-white border-amber-300',        icon: 'bg-amber-50 text-amber-500',      dot: 'bg-amber-400 animate-pulse', sub: 'text-amber-500' },
    success: { card: 'bg-emerald-50 border-emerald-300', icon: 'bg-emerald-100 text-emerald-600', dot: 'bg-emerald-500',             sub: 'text-emerald-600' },
    failed:  { card: 'bg-red-50 border-red-300',         icon: 'bg-red-100 text-red-500',         dot: 'bg-red-500',                 sub: 'text-red-500' },
    skipped: { card: 'bg-gray-50 border-gray-200',       icon: 'bg-gray-100 text-gray-400',       dot: 'bg-gray-300',                sub: 'text-gray-400' },
  };
  const s = styles[status] || styles.idle;

  const fmtDuration = (ms) => ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
  const showMeta = (status === 'success' || status === 'failed') && duration_ms > 0;

  return (
    <div className={`
      relative min-w-[220px] rounded-xl shadow-card border-2 transition-all cursor-pointer overflow-visible
      ${s.card}
      ${status === 'running' ? 'node-running-ring' : ''}
      ${selected ? 'ring-2 ring-offset-2 ring-indigo-400' : 'hover:shadow-card-hover'}
    `}>
      <Handle type="target" position={Position.Top}
        className="!w-3 !h-3 !bg-gray-300 !border-2 !border-white" />

      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${s.icon}`}>
            {status === 'running'
              ? <Loader2 size={16} className="animate-spin" />
              : status === 'success'
                ? <CheckCircle2 size={16} strokeWidth={2} />
                : status === 'failed'
                  ? <XCircle size={16} strokeWidth={2} />
                  : status === 'skipped'
                    ? <MinusCircle size={16} strokeWidth={2} />
                    : <Bot size={16} strokeWidth={1.75} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{label || agentName || 'Agent'}</p>
            <p className={`text-[10px] mt-0.5 ${s.sub}`}>
              {status === 'idle'    ? 'Ready'
                : status === 'running' ? 'Executing...'
                : status === 'success' ? 'Completed — click to view'
                : status === 'skipped' ? 'Skipped'
                : 'Failed — click to view'}
            </p>
          </div>
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
        </div>

        {/* Duration + status row — shown after execution */}
        {showMeta && (
          <div className={`mt-3 pt-2.5 border-t flex items-center gap-2 ${
            status === 'failed' ? 'border-red-100' : 'border-emerald-100'
          }`}>
            <Clock size={11} className={status === 'failed' ? 'text-red-400' : 'text-emerald-500'} />
            <span className={`text-[10px] font-semibold ${status === 'failed' ? 'text-red-500' : 'text-emerald-600'}`}>
              {fmtDuration(duration_ms)}
            </span>
            <span className={`text-[10px] ml-auto font-medium ${status === 'failed' ? 'text-red-400' : 'text-emerald-500'}`}>
              {status === 'success' ? 'Execution Successful' : 'Execution Failed'}
            </span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom}
        className="!w-3 !h-3 !bg-gray-300 !border-2 !border-white" />
    </div>
  );
}

export default memo(AgentNode);
