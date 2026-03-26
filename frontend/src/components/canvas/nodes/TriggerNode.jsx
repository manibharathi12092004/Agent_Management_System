import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';

function TriggerNode({ data, selected }) {
  return (
    <div
      className={`bg-n8n-coral text-white border rounded-lg p-4 min-w-[180px] shadow-sm transition-all ${
        selected ? 'ring-2 ring-n8n-coral ring-opacity-50' : 'border-n8n-coral'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white bg-opacity-20 rounded-lg">
          <Play size={20} strokeWidth={1.5} />
        </div>
        <div className="font-medium text-sm">{data.label || '▶ Start'}</div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-white !border-2 !border-n8n-coral"
      />
    </div>
  );
}

export default memo(TriggerNode);
