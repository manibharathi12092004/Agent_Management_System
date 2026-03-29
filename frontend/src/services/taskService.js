import apiClient from './api';

export const taskService = {
  getAll:      ()              => apiClient.get('/tasks/'),
  getById:     (id)            => apiClient.get(`/tasks/${id}/`),
  create:      (data)          => apiClient.post('/tasks/', data),
  update:      (id, data)      => apiClient.put(`/tasks/${id}/`, data),
  remove:      (id)            => apiClient.delete(`/tasks/${id}/`),
  autoSuggest: (desc)          => apiClient.post('/tasks/auto-suggest', { task_description: desc }),
  dryRun:      (id, inputData) => apiClient.post(`/tasks/${id}/dry-run`, { input_data: inputData ?? {} }),
};
