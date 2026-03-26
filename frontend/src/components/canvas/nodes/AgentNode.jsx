import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot } from 'lucide-react';
import { getStatusPulse } from '../../../utils/statusColors';

function AgentNode({ data, selected }) {
  const { label, agentName, status } = data;
  const pulseClass = getStatusPulse(status);

  return (
    <div
      className={`bg-white border rounded-lg p-4 min-w-[200px] shadow-sm transition-all ${
        selected ? 'border-indigo ring-2 ring-indigo ring-opacity-50' : 'border-gray-200'
      } ${pulseClass}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-300 !border-2 !border-white"
      />
      
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-50 rounded-lg">
          <Bot size={20} className="text-indigo" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <div className="font-medium text-gray-900 text-sm">{label || agentName || 'Agent'}</div>
          {status && status !== 'idle' && (
            <div className="text-xs text-gray-500 mt-0.5 capitalize">{status}</div>
          )}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-gray-300 !border-2 !border-white"
      />
    </div>
  );
}

export default memo(AgentNode);
