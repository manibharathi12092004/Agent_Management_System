import apiClient from './api';

export const schedulerService = {
  getAll:   ()           => apiClient.get('/schedules/'),
  getById:  (id)         => apiClient.get(`/schedules/${id}/`),
  create:   (data)       => apiClient.post('/schedules/', data),
  update:   (id, data)   => apiClient.put(`/schedules/${id}/`, data),
  remove:   (id)         => apiClient.delete(`/schedules/${id}/`),
  toggle:   (id)         => apiClient.post(`/schedules/${id}/toggle`),
  trigger:  (id)         => apiClient.post(`/schedules/${id}/trigger`),
};
