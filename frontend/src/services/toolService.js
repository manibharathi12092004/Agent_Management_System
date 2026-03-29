import apiClient from './api';

export const toolService = {
  getAll: () => apiClient.get('/tools/'),
  getById: (id) => apiClient.get(`/tools/${id}/`),
  assignAgents: (toolId, agentIds) =>
    apiClient.post(`/tools/${toolId}/assign-agents`, { agent_ids: agentIds }),
  unassignAgents: (toolId, agentIds) =>
    apiClient.post(`/tools/${toolId}/unassign-agents`, { agent_ids: agentIds }),
  // legacy alias
  assignToAgents: (toolId, agentIds) =>
    apiClient.post(`/tools/${toolId}/assign-agents`, { agent_ids: agentIds }),
};
