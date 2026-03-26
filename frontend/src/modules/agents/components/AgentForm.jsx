import { useState, useEffect } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import { agentService } from '../../../services/agentService';
import { llmService } from '../../../services/llmService';
import { toolService } from '../../../services/toolService';

export default function AgentForm({ agent = null, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_prompt: '',
    llm_config_id: null,
    parent_agent_id: null,
  });
  const [skillFile, setSkillFile] = useState(null);
  const [useSkillFile, setUseSkillFile] = useState(false);
  const [llmConfigs, setLlmConfigs] = useState([]);
  const [tools, setTools] = useState([]);
  const [selectedTools, setSelectedTools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLLMConfigs();
    loadTools();
    if (agent) {
      setFormData({
        name: agent.name || '',
        description: agent.description || '',
        system_prompt: agent.system_prompt || '',
        llm_config_id: agent.llm_config_id || null,
        parent_agent_id: agent.parent_agent_id || null,
      });
      setUseSkillFile(!!agent.skill_file_path);
      if (agent.tools) {
        setSelectedTools(agent.tools.map(t => t.id));
      }
    }
  }, [agent]);

  const loadLLMConfigs = async () => {
    try {
      const { data } = await llmService.getAll();
      setLlmConfigs(data);
    } catch (err) {
      console.error('Failed to load LLM configs:', err);
    }
  };

  const loadTools = async () => {
    try {
      const { data } = await toolService.getAll();
      setTools(data);
    } catch (err) {
      console.error('Failed to load tools:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Prepare data for API
      const apiData = {
        name: formData.name,
        description: formData.description,
        system_prompt: useSkillFile ? null : formData.system_prompt,
        llm_config_id: formData.llm_config_id,
        parent_agent_id: formData.parent_agent_id,
        tool_ids: selectedTools,
      };

      // Create agent (with optional skill file)
      const { data } = await agentService.create(apiData, useSkillFile ? skillFile : null);

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save agent');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.md')) {
      setSkillFile(file);
    } else {
      alert('Please select a .md file');
    }
  };

  const toggleTool = (toolId) => {
    setSelectedTools(prev =>
      prev.includes(toolId)
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {agent ? 'Edit Agent' : 'Create Agent'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo focus:border-transparent"
                placeholder="e.g., Sales Agent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo focus:border-transparent"
                placeholder="Describe what this agent does..."
              />
            </div>

            {/* Skill Source Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skill Source
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!useSkillFile}
                    onChange={() => setUseSkillFile(false)}
                    className="text-indigo focus:ring-indigo"
                  />
                  <span className="text-sm text-gray-700">System Prompt</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={useSkillFile}
                    onChange={() => setUseSkillFile(true)}
                    className="text-indigo focus:ring-indigo"
                  />
                  <span className="text-sm text-gray-700">Skill File (.md)</span>
                </label>
              </div>
            </div>

            {/* System Prompt or Skill File */}
            {!useSkillFile ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  System Prompt
                </label>
                <textarea
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo focus:border-transparent font-mono text-sm"
                  placeholder="Enter system prompt for the agent..."
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Skill File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo transition-colors">
                  <input
                    type="file"
                    accept=".md"
                    onChange={handleFileChange}
                    className="hidden"
                    id="skill-file"
                  />
                  <label htmlFor="skill-file" className="cursor-pointer">
                    {skillFile ? (
                      <div className="flex items-center justify-center gap-2 text-indigo">
                        <FileText size={20} />
                        <span className="text-sm">{skillFile.name}</span>
                      </div>
                    ) : (
                      <div>
                        <Upload size={32} className="mx-auto mb-2 text-gray-400" strokeWidth={1} />
                        <p className="text-sm text-gray-600">Click to upload .md file</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* LLM Config */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LLM Configuration
              </label>
              <select
                value={formData.llm_config_id || ''}
                onChange={(e) => setFormData({ ...formData, llm_config_id: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo focus:border-transparent"
              >
                <option value="">Use default LLM config</option>
                {llmConfigs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name} ({config.provider})
                  </option>
                ))}
              </select>
            </div>

            {/* Tools */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Tools
              </label>
              <div className="border border-gray-300 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                {tools.length === 0 ? (
                  <p className="text-sm text-gray-500">No tools available</p>
                ) : (
                  tools.map((tool) => (
                    <label
                      key={tool.id}
                      className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTools.includes(tool.id)}
                        onChange={() => toggleTool(tool.id)}
                        className="mt-1 text-indigo focus:ring-indigo"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{tool.name}</div>
                        <div className="text-xs text-gray-500">{tool.description}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : agent ? 'Update Agent' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
