export const getStatusBadgeClass = (status) => {
  const map = {
    COMPLETED:   'badge-green',
    IN_PROGRESS: 'badge-amber',
    FAILED:      'badge-red',
    NOT_STARTED: 'badge-gray',
    // node statuses
    idle:    'badge-gray',
    running: 'badge-amber',
    success: 'badge-green',
    failed:  'badge-red',
  };
  return map[status?.toUpperCase()] || map[status] || 'badge-gray';
};

export const getStatusDotClass = (status) => {
  const map = {
    COMPLETED:   'status-dot-green',
    IN_PROGRESS: 'status-dot-amber',
    FAILED:      'status-dot-red',
    NOT_STARTED: 'status-dot-gray',
    idle:    'status-dot-gray',
    running: 'status-dot-amber',
    success: 'status-dot-green',
    failed:  'status-dot-red',
  };
  return map[status?.toUpperCase()] || map[status] || 'status-dot-gray';
};

// Legacy compat
export const getStatusColor = getStatusBadgeClass;
export const getStatusPulse = (status) => {
  const map = { running: 'pulse-running', success: 'pulse-success', failed: 'pulse-failed' };
  return map[status?.toLowerCase()] || '';
};
