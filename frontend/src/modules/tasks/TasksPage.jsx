import { useState, useEffect, useCallback } from 'react';
import { Zap, Edit2, Play, Loader2 } from 'lucide-react';
import WorkflowCanvas from '../../components/canvas/WorkflowCanvas';
import TaskSidebarList from './components/TaskSidebarList';
import TaskFormSheet from './components/TaskFormSheet';
import NodeOutputPanel from './components/NodeOutputPanel';
import { taskService } from '../../services/taskService';
import { toast } from '../../components/ui/Toast';

const Y_START = 80;
const Y_GAP = 160;

export function buildCanvasLayout(steps, stepResults = {}) {
  const nodes = [
    {
      id: 'trigger',
      type: 'trigger',
      position: { x: 300, y: Y_START },
      data: { label: 'Start', status: stepResults.__running ? 'running' : 'idle' },
    },
    ...steps.map((s, i) => {
      const result = stepResults[s.agent_id];
      return {
        id: `agent-${s.agent_id}-${i}`,
        type: 'agent',
        position: { x: 300, y: Y_START + Y_GAP * (i + 1) },
        data: {
          label: s.agent_name,
          agentName: s.agent_name,
          agentId: s.agent_id,
          stepOrder: i + 1,
          status: result?.status || 'idle',
          output: result?.output || '',
          duration_ms: result?.duration_ms,
        },
      };
    }),
    {
      id: 'output',
      type: 'output',
      position: { x: 300, y: Y_START + Y_GAP * (steps.length + 1) },
      data: {
        label: 'End',
        status: stepResults.__done ? 'done' : 'idle',
        output: stepResults.__finalOutput || '',
      },
    },
  ];

  const edges = nodes.slice(0, -1).map((n, i) => ({
    id: `e-${i}`,
    source: n.id,
    target: nodes[i + 1].id,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#9ca3af', strokeWidth: 2 },
  }));

  return { nodes, edges };
}

export default function TasksPage() {
  const [selectedTask, setSelectedTask] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [canvasSteps, setCanvasSteps] = useState([]);
  const [stepResults, setStepResults] = useState({});
  const [running, setRunning] = useState(false);
  const [clickedNode, setClickedNode] = useState(null);

  // Derive nodes/edges directly — recomputed whenever steps or results change
  const { nodes, edges } = buildCanvasLayout(canvasSteps, stepResults);

  const handleSelectTask = useCallback((task) => {
    // Clicking the already-selected task → deselect and reset canvas
    if (selectedTask?.id === task.id) {
      setSelectedTask(null);
      setCanvasSteps([]);
      setStepResults({});
      setClickedNode(null);
      return;
    }
    setSelectedTask(task);
    const steps = (task.steps || []).sort((a, b) => a.step_order - b.step_order);
    setCanvasSteps(steps);
    setStepResults({});
    setSheetOpen(false);
    setClickedNode(null);
  }, [selectedTask]);

  const handleEditTask = useCallback((task) => {
    setSelectedTask(task);
    const steps = (task.steps || []).sort((a, b) => a.step_order - b.step_order);
    setCanvasSteps(steps);
    setSheetOpen(true);
    setClickedNode(null);
  }, []);

  const handleNew = useCallback(() => {
    setSelectedTask(null);
    setCanvasSteps([]);
    setStepResults({});
    setSheetOpen(true);
    setClickedNode(null);
  }, []);

  const handleSaved = useCallback((savedTask) => {
    setRefreshKey(k => k + 1);
    if (savedTask?.steps) {
      const steps = savedTask.steps.sort((a, b) => a.step_order - b.step_order);
      setCanvasSteps(steps);
      setSelectedTask(savedTask);
      setStepResults({});
    }
  }, []);

  // ── Dry run triggered by clicking TriggerNode ──────────────────────
  const handleDryRun = useCallback(async () => {
    if (!selectedTask?.id) { toast.error('Select a task first'); return; }
    if (running) return;

    setRunning(true);
    setStepResults({ __running: true });
    setClickedNode(null);

    try {
      const res = await taskService.dryRun(selectedTask.id, {});
      const results = res.data.results || [];

      // Build results map keyed by agent_id
      const map = { __running: false };
      let finalOutput = '';
      results.forEach(r => {
        const status = r.skipped ? 'skipped' : r.error ? 'failed' : 'success';
        map[r.agent_id] = {
          status,
          output: r.error || r.output,
          duration_ms: r.duration_ms,
        };
        if (!r.error && !r.skipped) finalOutput = r.output;
      });
      const anyFailed = results.some(r => r.error);
      map.__done = !anyFailed;
      map.__finalOutput = finalOutput;

      setStepResults(map);
      if (anyFailed) {
        toast.error('Workflow stopped — a step failed');
      } else {
        toast.success('Workflow completed');
      }
    } catch (err) {
      setStepResults({ __running: false, __done: false });
      toast.error(err.response?.data?.detail || 'Dry run failed');
    } finally {
      setRunning(false);
    }
  }, [selectedTask, running]);

  // ── Node click handler ─────────────────────────────────────────────
  const handleNodeClick = useCallback((node) => {
    if (node.type === 'trigger') {
      handleDryRun();
    } else if (node.type === 'agent' || node.type === 'output') {
      setClickedNode(prev => prev?.id === node.id ? null : node);
    }
  }, [handleDryRun]);

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {/* Left sidebar */}
      <TaskSidebarList
        onNew={handleNew}
        onSelect={handleSelectTask}
        onEdit={handleEditTask}
        selectedId={selectedTask?.id}
        refreshKey={refreshKey}
      />

      {/* Canvas area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Floating toolbar */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10">
          <div className="glass border border-white/60 rounded-full shadow-floating px-4 py-2 flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Zap size={12} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="w-px h-5 bg-gray-200" />
            <span className="text-sm font-semibold text-gray-700 truncate max-w-[180px]">
              {selectedTask?.name || 'Select a task'}
            </span>
            <div className="w-px h-5 bg-gray-200" />

            {selectedTask && (
              <>
                <button
                  onClick={handleDryRun}
                  disabled={running}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors disabled:opacity-50"
                >
                  {running
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Play size={12} strokeWidth={2.5} fill="currentColor" />
                  }
                  {running ? 'Running...' : 'Run'}
                </button>
                <button
                  onClick={() => handleEditTask(selectedTask)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                >
                  <Edit2 size={12} strokeWidth={2} /> Edit
                </button>
              </>
            )}

            <button
              onClick={handleNew}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              + New
            </button>
          </div>
        </div>

        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          onNodeClick={handleNodeClick}
        />

        {/* Node output panel */}
        {clickedNode && (
          <NodeOutputPanel
            node={clickedNode}
            onClose={() => setClickedNode(null)}
          />
        )}
      </div>

      {/* Right sheet */}
      <TaskFormSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        task={selectedTask}
        onSaved={handleSaved}
      />
    </div>
  );
}
