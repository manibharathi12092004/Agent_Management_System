import apiClient from './api';

export const taskService = {
  getAll: () => apiClient.get('/tasks/'),
  getById: (id) => apiClient.get(`/tasks/${id}/`),
  create: (data) => apiClient.post('/tasks/', data),
  update: (id, data) => apiClient.put(`/tasks/${id}/`, data),
  delete: (id) => apiClient.delete(`/tasks/${id}/`),
  autoSuggest: (taskDescription) => apiClient.post('/tasks/auto-suggest/', { 
    task_description: taskDescription 
  }),
  dryRun: (id) => apiClient.post(`/tasks/${id}/dry-run/`),
  saveCanvas: (id, canvasData) => apiClient.put(`/tasks/${id}/canvas/`, { 
    canvas_json: canvasData 
  }),
};
