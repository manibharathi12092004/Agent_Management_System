import { useState, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import { toast } from '../../../components/ui/Toast';
import { agentService } from '../../../services/agentService';
import { llmService } from '../../../services/llmService';
import { toolService } from '../../../services/toolService';
import { Upload, FileText, Loader2, Check, Sparkles } from 'lucide-react';

export default function AgentForm({ open, agent = null, preselectedDomainId = null, preselectedDomainName = null, onClose, onSuccess }) {
  const isEdit = !!agent;
  const [tab, setTab] = useState('prompt');
  const [form, setForm] = useState({ name: '', description: '', system_prompt: '', llm_config_id: '' });
  const [skillFile, setSkillFile] = useState(null);
  const [llmConfigs, setLlmConfigs] = useState([]);
  const [tools, setTools] = useState([]);
  const [selectedTools, setSelectedTools] = useState([]);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadMeta();
    if (agent) {
      setForm({
        name: agent.name || '',
        description: agent.description || '',
        system_prompt: agent.system_prompt || '',
        llm_config_id: agent.llm_config_id || '',
      });
      setTab(agent.skill_file_path ? 'file' : 'prompt');
      setSelectedTools(agent.tools?.map((t) => t.id) || []);
    } else {
      setForm({ name: '', description: '', system_prompt: '', llm_config_id: '' });
      setSkillFile(null);
      setSelectedTools([]);
      setTab('prompt');
    }
  }, [open, agent]);

  const loadMeta = async () => {
    try {
      const [{ data: l }, { data: t }] = await Promise.all([llmService.getAll(), toolService.getAll()]);
      setLlmConfigs(l);
      setTools(t);
    } catch { /* silent */ }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleTool = (id) =>
    setSelectedTools((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Agent name is required'); return; }
    setSaving(true);
    try {
      let domainId = preselectedDomainId || null;
      let isNewDomain = false;

      // Only call LLM suggest-domain if no domain is preselected
      if (!domainId) {
        setSuggesting(true);
        try {
          const { data: suggestion } = await agentService.suggestDomain({
            agent_name: form.name,
            skill_description: form.description,
            system_prompt: tab === 'prompt' ? form.system_prompt : null,
          });
          domainId = suggestion.domain_id;
          isNewDomain = suggestion.is_new_domain;
          if (suggestion.is_new_domain) toast.info(`New domain created: "${suggestion.domain_name}"`);
          else if (suggestion.domain_name) toast.success(`Assigned to domain: "${suggestion.domain_name}"`);
        } catch { /* proceed without domain */ }
        finally { setSuggesting(false); }
      }

      const payload = {
        name: form.name,
        description: form.description,
        system_prompt: tab === 'prompt' ? form.system_prompt : null,
        llm_config_id: form.llm_config_id || null,
        tool_ids: selectedTools,
        domain_id: domainId,
      };

      await agentService.create(payload, tab === 'file' ? skillFile : null);
      toast.success('Agent created successfully');
      onSuccess({ domainId, isNewDomain });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save agent');
    } finally {
      setSaving(false);
      setSuggesting(false);
    }
  };

  const footer = (
    <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
      {saving ? (
        <>
          <Loader2 size={15} className="animate-spin" />
          {suggesting ? 'Auto-assigning domain via AI...' : 'Saving...'}
        </>
      ) : (
        <>{isEdit ? 'Update Agent' : 'Create Agent'}</>
      )}
    </button>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Agent' : 'New Agent'}
      subtitle={
        isEdit
          ? `Editing ${agent?.name}`
          : preselectedDomainName
            ? `Adding to domain: ${preselectedDomainName}`
            : 'Domain will be auto-assigned by AI'
      }
      footer={footer}
      width="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Name */}
        <div>
          <label className="label">Agent Name *</label>
          <input className="input" placeholder="e.g. Sales Research Agent" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea className="input resize-none" rows={3} placeholder="What does this agent do?" value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>

        {/* Skill source tabs */}
        <div>
          <label className="label">Skill Source</label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {[{ id: 'prompt', label: 'System Prompt' }, { id: 'file', label: 'Skill File (.md)' }].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-indigo-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'prompt' ? (
          <div>
            <textarea
              className="input font-mono text-xs resize-none"
              rows={8}
              placeholder="You are a helpful assistant that..."
              value={form.system_prompt}
              onChange={(e) => set('system_prompt', e.target.value)}
            />
          </div>
        ) : (
          <div>
            <label
              htmlFor="skill-upload"
              className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
            >
              {skillFile ? (
                <><FileText size={24} className="text-indigo-500" /><span className="text-sm text-indigo-600 font-medium">{skillFile.name}</span></>
              ) : (
                <><Upload size={24} className="text-gray-300" /><span className="text-sm text-gray-500">Click to upload .md file</span></>
              )}
            </label>
            <input id="skill-upload" type="file" accept=".md" className="hidden" onChange={(e) => setSkillFile(e.target.files[0])} />
          </div>
        )}

        {/* LLM */}
        <div>
          <label className="label">LLM Configuration</label>
          <select className="input" value={form.llm_config_id} onChange={(e) => set('llm_config_id', e.target.value)}>
            <option value="">Use system default</option>
            {llmConfigs.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.provider})</option>
            ))}
          </select>
        </div>

        {/* Tools */}
        <div>
          <label className="label">Tools</label>
          <div className="flex flex-wrap gap-2">
            {tools.length === 0 ? (
              <p className="text-xs text-gray-400">No tools available</p>
            ) : tools.map((tool) => {
              const active = selectedTools.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => toggleTool(tool.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? 'bg-indigo-500 text-white border-indigo-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {active && <Check size={10} strokeWidth={3} />}
                  {tool.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Domain note */}
        <div className="flex items-start gap-2 p-3 bg-indigo-50 rounded-xl">
          <Sparkles size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-xs text-indigo-600">
            {preselectedDomainName
              ? <>Agent will be created inside <span className="font-semibold">{preselectedDomainName}</span> domain.</>
              : 'Domain will be automatically assigned by AI when you save this agent.'
            }
          </p>
        </div>
      </div>
    </Modal>
  );
}
