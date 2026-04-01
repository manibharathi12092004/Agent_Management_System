import apiClient from './api';

export const runHistoryService = {
  getAll: (params) => apiClient.get('/run-history/', { params }),
  getById: (id) => apiClient.get(`/run-history/${id}/`),
  getLogs: (id) => apiClient.get(`/run-history/${id}/logs/`),
};
