import apiClient from './api';

export const runHistoryService = {
  getAll: (params) => apiClient.get('/task-runs/', { params }),
  getById: (id) => apiClient.get(`/task-runs/${id}/`),
  getLogs: (id) => apiClient.get(`/task-runs/${id}/logs/`),
};
