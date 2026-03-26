import apiClient from './api';

export const toolService = {
  getAll: () => apiClient.get('/tools/'),
  getById: (id) => apiClient.get(`/tools/${id}/`),
  assignToAgents: (toolId, agentIds) => apiClient.post(`/tools/${toolId}/assign-agents/`, { agent_ids: agentIds }),
};
