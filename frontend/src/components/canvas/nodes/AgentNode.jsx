import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot, Loader2, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';

function AgentNode({ data, selected }) {
  const { label, agentName, status = 'idle' } = data;

  const styles = {
    idle:    { card: 'bg-white border-gray-200',         icon: 'bg-gray-50 text-gray-400',        dot: 'bg-gray-300',               sub: 'text-gray-400' },
    running: { card: 'bg-white border-amber-300',        icon: 'bg-amber-50 text-amber-500',      dot: 'bg-amber-400 animate-pulse', sub: 'text-amber-500' },
    success: { card: 'bg-emerald-50 border-emerald-300', icon: 'bg-emerald-100 text-emerald-600', dot: 'bg-emerald-500',             sub: 'text-emerald-600' },
    failed:  { card: 'bg-red-50 border-red-300',         icon: 'bg-red-100 text-red-500',         dot: 'bg-red-500',                 sub: 'text-red-500' },
    skipped: { card: 'bg-gray-50 border-gray-200',       icon: 'bg-gray-100 text-gray-400',       dot: 'bg-gray-300',                sub: 'text-gray-400' },
  };
  const s = styles[status] || styles.idle;

  return (
    <div className={`
      relative min-w-[200px] rounded-xl shadow-card border-2 transition-all cursor-pointer
      ${s.card}
      ${selected ? 'ring-2 ring-offset-2 ring-indigo-400' : 'hover:shadow-card-hover'}
    `}>
      <Handle type="target" position={Position.Top}
        className="!w-3 !h-3 !bg-gray-300 !border-2 !border-white" />

      <div className="p-4 flex items-center gap-3">
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
            {status === 'idle' ? 'Ready'
              : status === 'running' ? 'Executing...'
              : status === 'success' ? 'Completed — click to view'
              : status === 'skipped' ? 'Skipped (previous step failed)'
              : 'Failed — click to view'}
          </p>
        </div>
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
      </div>

      <Handle type="source" position={Position.Bottom}
        className="!w-3 !h-3 !bg-gray-300 !border-2 !border-white" />
    </div>
  );
}

export default memo(AgentNode);
