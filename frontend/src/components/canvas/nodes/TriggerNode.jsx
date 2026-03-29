import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play, Loader2 } from 'lucide-react';

function TriggerNode({ data, selected }) {
  const isRunning = data?.status === 'running';

  return (
    <div className={`
      relative min-w-[180px] rounded-xl shadow-card overflow-hidden transition-all cursor-pointer
      ${selected ? 'ring-2 ring-offset-2 ring-orange-400' : 'hover:scale-105'}
    `}
      title="Click to start dry run"
    >
      <div className={`p-4 ${isRunning ? 'bg-gradient-to-br from-amber-400 to-orange-400' : 'bg-gradient-to-br from-orange-400 to-red-400'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            {isRunning
              ? <Loader2 size={16} className="text-white animate-spin" />
              : <Play size={16} className="text-white" strokeWidth={2.5} fill="white" />
            }
          </div>
          <div>
            <p className="text-[10px] text-white/70 font-medium uppercase tracking-wide">
              {isRunning ? 'Running...' : 'Click to Run'}
            </p>
            <p className="text-sm font-semibold text-white">{data.label || 'Start'}</p>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom}
        className="!w-3 !h-3 !bg-orange-400 !border-2 !border-white !shadow-sm" />
    </div>
  );
}

export default memo(TriggerNode);
