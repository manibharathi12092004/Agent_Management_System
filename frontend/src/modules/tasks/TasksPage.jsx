import { useState, useEffect } from 'react';
import { Sparkles, Play, Save } from 'lucide-react';
import WorkflowCanvas from '../../components/canvas/WorkflowCanvas';
import { useCanvasStore } from '../../store/canvasStore';

export default function TasksPage() {
  const { nodes, edges, setNodes, setEdges } = useCanvasStore();
  const [taskName, setTaskName] = useState('Untitled Workflow');

  // Initialize with sample nodes
  useEffect(() => {
    if (nodes.length === 0) {
      setNodes([
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 250, y: 100 },
          data: { label: '▶ Start' },
        },
        {
          id: 'agent-1',
          type: 'agent',
          position: { x: 250, y: 250 },
          data: {
            label: 'Sales Agent',
            agentId: null,
            agentName: 'Sales Agent',
            status: 'idle',
          },
        },
        {
          id: 'output-1',
          type: 'output',
          position: { x: 250, y: 400 },
          data: { label: '⏹ End' },
        },
      ]);
      
      setEdges([
        {
          id: 'e-trigger-agent',
          source: 'trigger-1',
          target: 'agent-1',
          type: 'smoothstep',
          animated: true,
        },
        {
          id: 'e-agent-output',
          source: 'agent-1',
          target: 'output-1',
          type: 'smoothstep',
          animated: true,
        },
      ]);
    }
  }, []);

  const handleAutoSuggest = () => {
    console.log('Auto-suggest agents');
  };

  const handleDryRun = () => {
    console.log('Dry run workflow');
  };

  const handleSave = () => {
    console.log('Save workflow', { nodes, edges });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Floating Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-2">
        <input
          type="text"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          className="text-sm font-medium text-gray-900 bg-transparent border-none focus:outline-none w-48"
        />
        <div className="h-6 w-px bg-gray-200" />
        <button
          onClick={handleAutoSuggest}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
        >
          <Sparkles size={16} strokeWidth={1.5} />
          Auto-Suggest
        </button>
        <button
          onClick={handleDryRun}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
        >
          <Play size={16} strokeWidth={1.5} />
          Dry Run
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo text-white rounded hover:bg-indigo-600 transition-colors"
        >
          <Save size={16} strokeWidth={1.5} />
          Save
        </button>
      </div>

      {/* Canvas */}
      <WorkflowCanvas
        initialNodes={nodes}
        initialEdges={edges}
        onNodesChange={setNodes}
        onEdgesChange={setEdges}
      />
    </div>
  );
}
