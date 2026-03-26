import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Square } from 'lucide-react';

function OutputNode({ data, selected }) {
  return (
    <div
      className={`bg-gray-100 border rounded-lg p-4 min-w-[180px] shadow-sm transition-all ${
        selected ? 'border-gray-400 ring-2 ring-gray-400 ring-opacity-50' : 'border-gray-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-gray-400 !border-2 !border-white"
      />
      
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white rounded-lg">
          <Square size={20} className="text-gray-600" strokeWidth={1.5} />
        </div>
        <div className="font-medium text-gray-700 text-sm">{data.label || '⏹ End'}</div>
      </div>
    </div>
  );
}

export default memo(OutputNode);
