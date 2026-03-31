import apiClient from './api';

export const agentService = {
  // List all agents
  getAll: () => apiClient.get('/agents/'),
  
  // Get single agent by ID
  getById: (id) => apiClient.get(`/agents/${id}/`),
  
  // Create new agent (multipart/form-data with optional skill file)
  create: (data, skillFile = null) => {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    if (data.system_prompt) formData.append('system_prompt', data.system_prompt);
    if (data.llm_config_id) formData.append('llm_config_id', data.llm_config_id);
    if (data.parent_agent_id) formData.append('parent_agent_id', data.parent_agent_id);
    if (data.domain_id) formData.append('domain_id', data.domain_id);
    formData.append('is_active', 'true');
    if (data.run_in_sandbox) formData.append('run_in_sandbox', 'true');
    else formData.append('run_in_sandbox', 'false');
    
    // Add tool_ids as array
    if (data.tool_ids && data.tool_ids.length > 0) {
      data.tool_ids.forEach(id => formData.append('tool_ids', id));
    }
    
    // Add skill file if provided
    if (skillFile) {
      formData.append('skill_file', skillFile);
    }
    
    return apiClient.post('/agents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Update existing agent
  update: (id, data, skillFile = null) => {
    const formData = new FormData();
    if (data.name)        formData.append('name', data.name);
    if (data.description !== undefined) formData.append('description', data.description || '');
    if (data.system_prompt !== undefined) formData.append('system_prompt', data.system_prompt || '');
    if (data.llm_config_id) formData.append('llm_config_id', data.llm_config_id);
    formData.append('run_in_sandbox', data.run_in_sandbox ? 'true' : 'false');
    if (data.tool_ids && data.tool_ids.length > 0) {
      data.tool_ids.forEach(tid => formData.append('tool_ids', tid));
    }
    if (skillFile) formData.append('skill_file', skillFile);
    return apiClient.put(`/agents/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadSkill: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/agents/${id}/upload-skill`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Dry run agent
  dryRun: (id, prompt) => apiClient.post(`/agents/${id}/dry-run`, { prompt }),
  
  // Suggest domain for new agent (LLM-based)
  suggestDomain: (data) => apiClient.post('/agents/suggest-domain', data),

  // Delete agent
  delete: (id) => apiClient.delete(`/agents/${id}/`),

  // Update agent sandbox config
  updateSandbox: (id, runInSandbox, sandboxConfig = {}) => {
    const formData = new FormData();
    formData.append('run_in_sandbox', runInSandbox ? 'true' : 'false');
    formData.append('sandbox_config', JSON.stringify(sandboxConfig));
    return apiClient.patch(`/agents/${id}/sandbox`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
