import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import AgentNode from './nodes/AgentNode';
import TriggerNode from './nodes/TriggerNode';
import OutputNode from './nodes/OutputNode';

const nodeTypes = { agent: AgentNode, trigger: TriggerNode, output: OutputNode };

function useStableSync(setter, propValue) {
  // Only call setter when the serialized value actually changes — prevents
  // React Flow internal state wipe from reference-only changes
  const prevRef = useRef(null);
  useEffect(() => {
    const serialized = JSON.stringify(propValue);
    if (serialized !== prevRef.current) {
      prevRef.current = serialized;
      setter(propValue);
    }
  }, [propValue]);
}

export default function WorkflowCanvas({ nodes: propNodes = [], edges: propEdges = [], onNodeClick }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(propNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(propEdges);

  // Sync only when content actually changes, not just reference
  useStableSync(setNodes, propNodes);
  useStableSync(setEdges, propEdges);

  const handleNodeClick = useCallback((_, node) => {
    if (onNodeClick) onNodeClick(node);
  }, [onNodeClick]);

  return (
    <div className="w-full h-full canvas-bg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.35 }}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{ type: 'smoothstep', animated: true, style: { stroke: '#9ca3af', strokeWidth: 2 } }}
      >
        <Background color="#e5e7eb" gap={20} size={1} />
        <Controls className="bg-white border border-gray-200 rounded-lg shadow-sm" />
        <MiniMap
          className="bg-white border border-gray-200 rounded-lg"
          nodeColor={(node) => {
            if (node.type === 'trigger') return '#fb923c';
            if (node.data?.status === 'success') return '#22c55e';
            if (node.data?.status === 'failed')  return '#ef4444';
            if (node.data?.status === 'running') return '#f59e0b';
            return '#e2e8f0';
          }}
        />
      </ReactFlow>
    </div>
  );
}
