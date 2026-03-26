import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import AgentNode from './nodes/AgentNode';
import TriggerNode from './nodes/TriggerNode';
import OutputNode from './nodes/OutputNode';

const nodeTypes = {
  agent: AgentNode,
  trigger: TriggerNode,
  output: OutputNode,
};

export default function WorkflowCanvas({ initialNodes = [], initialEdges = [], onNodesChange: onNodesChangeCallback, onEdgesChange: onEdgesChangeCallback }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#9ca3af', strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      if (onEdgesChangeCallback) onEdgesChangeCallback(edges);
    },
    [setEdges, edges, onEdgesChangeCallback]
  );

  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      if (onNodesChangeCallback) onNodesChangeCallback(nodes);
    },
    [onNodesChange, nodes, onNodesChangeCallback]
  );

  const handleEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      if (onEdgesChangeCallback) onEdgesChangeCallback(edges);
    },
    [onEdgesChange, edges, onEdgesChangeCallback]
  );

  return (
    <div className="w-full h-full canvas-bg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#9ca3af', strokeWidth: 2 },
        }}
      >
        <Background color="#e5e7eb" gap={20} size={1} />
        <Controls className="bg-white border border-gray-200 rounded-lg shadow-sm" />
        <MiniMap
          className="bg-white border border-gray-200 rounded-lg"
          nodeColor={(node) => {
            if (node.type === 'trigger') return '#ff6d5a';
            if (node.type === 'output') return '#9ca3af';
            if (node.data.status === 'success') return '#22c55e';
            if (node.data.status === 'failed') return '#ef4444';
            if (node.data.status === 'running') return '#f59e0b';
            return '#e5e7eb';
          }}
        />
      </ReactFlow>
    </div>
  );
}
