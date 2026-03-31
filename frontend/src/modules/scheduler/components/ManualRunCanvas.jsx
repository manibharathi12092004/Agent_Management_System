import { useState, useCallback, useMemo, useRef } from 'react';
import { X, Play, Loader2, Hand } from 'lucide-react';
import WorkflowCanvas from '../../../components/canvas/WorkflowCanvas';
import NodeOutputPanel from '../../tasks/components/NodeOutputPanel';
import { toast } from '../../../components/ui/Toast';

const Y_START = 80;
const Y_GAP = 160;

// Identical layout builder to TasksPage — stable reference via useMemo
function buildCanvasLayout(steps, stepResults = {}) {
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

export default function ManualRunCanvas({ schedule, onClose }) {
  const [stepResults, setStepResults] = useState({});
  const [running, setRunning] = useState(false);
  const [clickedNodeId, setClickedNodeId] = useState(null);

  // Stable steps — only recomputed when schedule changes, not on every stepResults update
  const canvasSteps = useMemo(() => {
    const task = schedule?.tasks?.[0] || null;
    return task ? [...(task.steps || [])].sort((a, b) => a.step_order - b.step_order) : [];
  }, [schedule]);

  const task = schedule?.tasks?.[0] || null;

  // Nodes/edges recomputed when steps or results change
  const { nodes, edges } = useMemo(
    () => buildCanvasLayout(canvasSteps, stepResults),
    [canvasSteps, stepResults]
  );

  // Derive clicked node from live nodes so data is always fresh
  const clickedNode = useMemo(
    () => clickedNodeId ? nodes.find(n => n.id === clickedNodeId) || null : null,
    [clickedNodeId, nodes]
  );

  // Use ref for canvasSteps inside async callback to avoid stale closure
  const stepsRef = useRef(canvasSteps);
  stepsRef.current = canvasSteps;

  const handleDryRun = useCallback(async () => {
    if (!task?.id) { toast.error('No task assigned to this schedule'); return; }
    if (running) return;

    const steps = stepsRef.current;
    setRunning(true);
    setClickedNodeId(null);

    const startedAt = new Date().toISOString();
    const initial = { __running: true };
    steps.forEach((s, i) => {
      initial[s.agent_id] = { status: i === 0 ? 'running' : 'idle', output: '', duration_ms: 0 };
    });
    setStepResults({ ...initial });

    const logLines = [];
    const accumulated = {};
    let anyFailed = false;
    let totalSteps = steps.length;
    let successCount = 0, failedCount = 0, skippedCount = 0;

    // UTC timestamp helper matching backend format
    const utcNow = () => new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}/tasks/${task.id}/dry-run-stream`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input_data: {} }) }
      );

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let stepIndex = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;

          try {
            const result = JSON.parse(payload);
            const status = result.skipped ? 'skipped' : result.error ? 'failed' : 'success';
            if (status === 'failed') { anyFailed = true; failedCount++; }
            else if (status === 'skipped') skippedCount++;
            else successCount++;

            accumulated[result.agent_id] = {
              status,
              output: result.error || result.output,
              duration_ms: result.duration_ms,
            };

            // Build log lines matching cron format exactly
            const ts = utcNow();
            if (result.skipped) {
              logLines.push(`[${ts}] [SKIP]  Step ${result.step_order} — ${result.agent_name}`);
            } else if (result.error) {
              logLines.push(`[${ts}] [FAIL]  Step ${result.step_order} — ${result.agent_name}  (${result.duration_ms}ms)`);
              logLines.push(`[${ts}]         Error: ${result.error}`);
            } else {
              logLines.push(`[${ts}] [OK]    Step ${result.step_order} — ${result.agent_name}  (${result.duration_ms}ms)`);
              const preview = (result.output || '').replace(/\n/g, ' ').trim().slice(0, 300);
              if (preview) logLines.push(`[${ts}]         Output: ${preview}${result.output?.length > 300 ? '...' : ''}`);
            }

            stepIndex++;
            const nextStep = steps[stepIndex];
            const nextRunning = nextStep && !result.error && !result.skipped
              ? { [nextStep.agent_id]: { status: 'running', output: '', duration_ms: 0 } }
              : {};

            setStepResults(prev => ({
              ...prev,
              __running: stepIndex < steps.length,
              ...accumulated,
              ...nextRunning,
            }));
          } catch { /* skip malformed */ }
        }
      }

      const finalOutput = Object.values(accumulated).reduce((out, r) => r.status === 'success' ? r.output : out, '');
      setStepResults(prev => ({
        ...prev,
        __running: false,
        __done: !anyFailed,
        __finalOutput: finalOutput,
        ...accumulated,
      }));

      // Build header + summary matching cron log format
      const sep = '─'.repeat(60);
      const completedAt = new Date();
      const durationSeconds = (completedAt - new Date(startedAt)) / 1000;
      const startTs = new Date(startedAt).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
      const endTs = utcNow();

      const fullLog = [
        `[${startTs}] Starting workflow | task_id=${task.id}`,
        `[${endTs}] ${sep}`,
        `[${endTs}] WORKFLOW: ${task.name}`,
        `[${endTs}] STEPS: ${totalSteps} total  |  ${successCount} succeeded  |  ${failedCount} failed  |  ${skippedCount} skipped`,
        `[${endTs}] ${sep}`,
        ...logLines,
        `[${endTs}] ${sep}`,
        `[${endTs}] ${!anyFailed ? '[SUCCESS] Workflow completed successfully' : `[PARTIAL] Workflow finished with ${failedCount} failed step(s)`}`,
      ].join('\n');

      if (anyFailed) toast.error('Workflow stopped — a step failed');
      else toast.success(`"${schedule.name}" completed successfully`);

      // Save to run history
      await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}/run-history/record`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_id: task.id,
            schedule_id: schedule.id,
            status: anyFailed ? 'failed' : 'completed',
            log_output: fullLog,
            duration_seconds: durationSeconds,
            started_at: startedAt,
          }),
        }
      );

    } catch {
      setStepResults(prev => ({ ...prev, __running: false, __done: false }));
      toast.error('Run failed');
    } finally {
      setRunning(false);
    }
  }, [task, running, schedule]);

  const handleNodeClick = useCallback((node) => {
    if (node.type === 'trigger') {
      handleDryRun();
    } else if (node.type === 'agent' || node.type === 'output') {
      setClickedNodeId(prev => prev === node.id ? null : node.id);
    }
  }, [handleDryRun]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="relative flex-1 overflow-hidden">

        {/* Floating toolbar */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10">
          <div className="glass border border-white/60 rounded-full shadow-floating px-4 py-2 flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center flex-shrink-0">
              <Hand size={12} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="w-px h-5 bg-gray-200" />
            <span className="text-sm font-semibold text-gray-700">{schedule.name}</span>
            {task && (
              <>
                <div className="w-px h-5 bg-gray-200" />
                <span className="text-xs text-gray-500">{task.name}</span>
              </>
            )}
            <div className="w-px h-5 bg-gray-200" />

            {task && (
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
            )}

            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={12} strokeWidth={2.5} /> Close
            </button>
          </div>
        </div>

        {canvasSteps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center canvas-bg">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Hand size={28} className="text-gray-300" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold text-gray-600">No workflow steps</p>
            <p className="text-xs text-gray-400 mt-1">Assign a task with steps to this schedule first</p>
          </div>
        ) : (
          <WorkflowCanvas nodes={nodes} edges={edges} onNodeClick={handleNodeClick} />
        )}

        {clickedNode && (
          <NodeOutputPanel node={clickedNode} onClose={() => setClickedNodeId(null)} />
        )}
      </div>
    </div>
  );
}
