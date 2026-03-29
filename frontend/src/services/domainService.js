import apiClient from './api';

export const domainService = {
  // Get all domains with agent count
  getAll: () => apiClient.get('/domains/'),
  
  // Get single domain by ID
  getById: (id) => apiClient.get(`/domains/${id}`),
  
  // Get all agents in a specific domain
  getDomainAgents: (domainId) => apiClient.get(`/domains/${domainId}/agents`),
  
  // Create new domain (usually called by backend automatically)
  create: (data) => apiClient.post('/domains/', data),
  
  // Update domain
  update: (id, data) => apiClient.put(`/domains/${id}`, data),
  
  // Delete domain
  delete: (id) => apiClient.delete(`/domains/${id}`),
};
