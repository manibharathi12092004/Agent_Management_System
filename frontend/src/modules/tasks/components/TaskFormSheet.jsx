import { useState, useEffect } from 'react';
import { Loader2, Play, Save, AlertCircle, Sparkles, Users } from 'lucide-react';
import Sheet from '../../../components/ui/Sheet';
import { toast } from '../../../components/ui/Toast';
import { taskService } from '../../../services/taskService';
import { agentService } from '../../../services/agentService';
import { llmService } from '../../../services/llmService';
import AgentPickerPanel from './AgentPickerPanel';
import StepList from './StepList';
import DryRunPanel from './DryRunPanel';

const INITIAL = {
  name: '', description: '',
  agentMode: 'manual',   // 'manual' | 'auto'
  autoAgentDesc: '',
  workflowMode: 'manual', // 'manual' | 'auto'
  steps: [],
  dryRunning: false, dryRunResults: [], nameError: '',
};

function ModeToggle({ value, onChange, options }) {
  return (
    <div className="flex gap-1.5 p-1 bg-gray-100 rounded-lg">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
            value === o.value
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {o.icon} {o.label}
        </button>
      ))}
    </div>
  );
}

export default function TaskFormSheet({ open, onClose, task, onSaved }) {
  const [form, setForm] = useState(INITIAL);
  const [agents, setAgents] = useState([]);
  const [llmConfigs, setLlmConfigs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [autoAgentLoading, setAutoAgentLoading] = useState(false);
  const [autoWorkflowLoading, setAutoWorkflowLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    agentService.getAll().then(r => setAgents(r.data)).catch(() => {});
    llmService.getAll().then(r => setLlmConfigs(r.data)).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setForm({
        ...INITIAL,
        name: task.name || '',
        description: task.description || '',
        steps: (task.steps || []).map(s => ({
          agent_id: s.agent_id, agent_name: s.agent_name,
          step_order: s.step_order, llm_override_id: s.llm_override_id || null,
          step_config: s.step_config || {},
        })),
      });
    } else {
      setForm(INITIAL);
    }
  }, [open, task]);

  const set = p => setForm(prev => ({ ...prev, ...p }));
  const selectedAgentIds = form.steps.map(s => s.agent_id);

  // ── Agent selection ────────────────────────────────────────────────

  const handleAgentToggle = ({ agent_id, agent_name }) => {
    setForm(prev => {
      const already = prev.steps.some(s => s.agent_id === agent_id);
      if (already) {
        return { ...prev, steps: prev.steps.filter(s => s.agent_id !== agent_id).map((s, i) => ({ ...s, step_order: i + 1 })) };
      }
      return { ...prev, steps: [...prev.steps, { agent_id, agent_name, step_order: prev.steps.length + 1, llm_override_id: null, step_config: {} }] };
    });
  };

  const handleAutoAgents = async () => {
    if (!form.name.trim() && !form.description.trim()) {
      toast.error('Enter a task name or description first');
      return;
    }
    setAutoAgentLoading(true);
    try {
      const desc = form.description.trim() || form.name.trim();
      const res = await taskService.autoSuggest(desc);
      const steps = (res.data.steps || []).map((s, i) => ({
        agent_id: s.agent_id, agent_name: s.agent_name,
        step_order: i + 1, llm_override_id: null, step_config: {},
      }));
      set({ steps });
      toast.success(`LLM selected ${steps.length} agent(s)`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Auto agent selection failed');
    } finally {
      setAutoAgentLoading(false);
    }
  };

  // ── Workflow ordering ──────────────────────────────────────────────

  const handleAutoWorkflow = async () => {
    if (form.steps.length === 0) { toast.error('Select agents first'); return; }
    setAutoWorkflowLoading(true);
    try {
      const desc = form.description.trim() || form.name.trim();
      const res = await taskService.autoSuggest(desc);
      const suggested = res.data.steps || [];
      // Re-order existing steps to match LLM suggestion order
      const reordered = suggested
        .map(s => form.steps.find(st => st.agent_id === s.agent_id))
        .filter(Boolean)
        .map((s, i) => ({ ...s, step_order: i + 1 }));
      // Append any steps not in suggestion at the end
      const inSuggestion = new Set(suggested.map(s => s.agent_id));
      const remaining = form.steps.filter(s => !inSuggestion.has(s.agent_id)).map((s, i) => ({ ...s, step_order: reordered.length + i + 1 }));
      set({ steps: [...reordered, ...remaining] });
      toast.success('Workflow order optimized by LLM');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Auto workflow failed');
    } finally {
      setAutoWorkflowLoading(false);
    }
  };

  const handleReorder = newSteps => set({ steps: newSteps });
  const handleLLMOverride = (index, id) => {
    setForm(prev => { const s = [...prev.steps]; s[index] = { ...s[index], llm_override_id: id }; return { ...prev, steps: s }; });
  };
  const handleRemoveStep = index => {
    setForm(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i + 1 })) }));
  };

  // ── Dry run ────────────────────────────────────────────────────────

  const handleDryRun = async () => {
    if (!task?.id) { toast.info('Save the task first'); return; }
    set({ dryRunning: true, dryRunResults: [] });
    try {
      const res = await taskService.dryRun(task.id, {});
      set({ dryRunResults: res.data.results || [] });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Dry run failed');
    } finally {
      set({ dryRunning: false });
    }
  };

  // ── Save ───────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim()) { set({ nameError: 'Task name is required' }); return; }
    set({ nameError: '' });
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      steps: form.steps.map((s, i) => ({ agent_id: s.agent_id, step_order: i + 1, llm_override_id: s.llm_override_id || null, step_config: s.step_config || {} })),
    };
    try {
      if (task?.id) {
        const res = await taskService.update(task.id, payload);
        toast.success('Task updated');
        onSaved?.(res.data);
      } else {
        const res = await taskService.create(payload);
        toast.success('Task created');
        onSaved?.(res.data);
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save task');
    } finally { setSaving(false); }
  };

  const footer = (
    <div className="flex items-center gap-2">
      <button onClick={handleDryRun} disabled={form.dryRunning || saving}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
        {form.dryRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} className="text-emerald-500" />}
        {form.dryRunning ? 'Running...' : 'Dry Run'}
      </button>
      <button onClick={handleSave} disabled={saving || form.dryRunning}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors ml-auto">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saving ? 'Saving...' : task?.id ? 'Update Task' : 'Save Task'}
      </button>
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} title={task?.id ? 'Edit Task' : 'New Task'}
      subtitle="Configure your multi-agent workflow" footer={footer} width="w-[480px]">
      <div className="space-y-5">

        {/* 1. Task Name */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Task Name <span className="text-red-400">*</span></label>
          <input type="text" value={form.name} onChange={e => set({ name: e.target.value, nameError: '' })}
            maxLength={255} placeholder="e.g. Weekly Report Pipeline"
            className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${form.nameError ? 'border-red-300' : 'border-gray-200'}`} />
          {form.nameError && <p className="flex items-center gap-1 text-xs text-red-500 mt-1"><AlertCircle size={11} /> {form.nameError}</p>}
        </div>

        {/* 2. Description */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <textarea value={form.description} onChange={e => set({ description: e.target.value })}
            rows={2} placeholder="What should this workflow accomplish?"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-400" />
        </div>

        {/* 3. Agent Selection */}
        <div className="border border-gray-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">Agent Selection</label>
            <span className="text-xs text-gray-400">{form.steps.length} selected</span>
          </div>

          <ModeToggle
            value={form.agentMode}
            onChange={v => set({ agentMode: v })}
            options={[
              { value: 'manual', label: 'Manual Select', icon: <Users size={12} /> },
              { value: 'auto',   label: 'Auto by LLM',  icon: <Sparkles size={12} /> },
            ]}
          />

          {form.agentMode === 'manual' ? (
            <AgentPickerPanel agents={agents} selectedAgentIds={selectedAgentIds} onAgentToggle={handleAgentToggle} />
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">LLM will choose the best agents based on your task name and description.</p>
              <button onClick={handleAutoAgents} disabled={autoAgentLoading}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors">
                {autoAgentLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {autoAgentLoading ? 'Selecting agents...' : 'Auto Select Agents'}
              </button>
            </div>
          )}
        </div>

        {/* 4. Workflow Mode — only shown once agents are selected */}
        {form.steps.length > 0 && (
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <label className="text-xs font-semibold text-gray-700">Workflow Order</label>

            <ModeToggle
              value={form.workflowMode}
              onChange={v => set({ workflowMode: v })}
              options={[
                { value: 'manual', label: 'Manual Order',  icon: <Users size={12} /> },
                { value: 'auto',   label: 'Auto by LLM',  icon: <Sparkles size={12} /> },
              ]}
            />

            {form.workflowMode === 'auto' && (
              <button onClick={handleAutoWorkflow} disabled={autoWorkflowLoading}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors">
                {autoWorkflowLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {autoWorkflowLoading ? 'Optimizing...' : 'Auto Order Workflow'}
              </button>
            )}

            {/* 5. Workflow steps — always visible once agents selected */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Workflow ({form.steps.length} steps)</p>
              <StepList steps={form.steps} llmConfigs={llmConfigs}
                onReorder={handleReorder} onLLMOverride={handleLLMOverride} onRemove={handleRemoveStep} />
            </div>
          </div>
        )}

        {/* 6. Dry run results */}
        {(form.dryRunning || form.dryRunResults.length > 0) && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Dry Run Results</label>
            <DryRunPanel results={form.dryRunResults} loading={form.dryRunning} />
          </div>
        )}

      </div>
    </Sheet>
  );
}
