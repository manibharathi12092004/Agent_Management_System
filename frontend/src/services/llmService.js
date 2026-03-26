import apiClient from './api';

export const llmService = {
  getAll: () => apiClient.get('/llm-configs/'),
  getById: (id) => apiClient.get(`/llm-configs/${id}/`),
  create: (data) => apiClient.post('/llm-configs/', data),
  update: (id, data) => apiClient.put(`/llm-configs/${id}/`, data),
  delete: (id) => apiClient.delete(`/llm-configs/${id}/`),
  setDefault: (id) => apiClient.post(`/llm-configs/${id}/set-default/`),
};
