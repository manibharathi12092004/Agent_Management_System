import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CheckCircle2, Square } from 'lucide-react';

function OutputNode({ data, selected }) {
  const isDone = data?.status === 'done';

  return (
    <div className={`
      relative min-w-[180px] rounded-xl shadow-card border-2 transition-all
      ${isDone ? 'bg-emerald-50 border-emerald-300 cursor-pointer' : 'bg-white border-gray-200'}
      ${selected ? 'ring-2 ring-offset-2 ring-gray-400' : isDone ? 'hover:shadow-card-hover' : ''}
    `}>
      <Handle type="target" position={Position.Top}
        className="!w-3 !h-3 !bg-gray-300 !border-2 !border-white" />

      <div className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
          {isDone
            ? <CheckCircle2 size={16} strokeWidth={2} />
            : <Square size={16} strokeWidth={1.75} />
          }
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{isDone ? 'Completed' : 'End'}</p>
          <p className={`text-[10px] mt-0.5 ${isDone ? 'text-emerald-600' : 'text-gray-400'}`}>
            {isDone ? 'Click to view output' : 'Workflow end'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(OutputNode);
