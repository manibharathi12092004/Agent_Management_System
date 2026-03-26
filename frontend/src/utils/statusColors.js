export const getStatusColor = (status) => {
  const colors = {
    idle: 'bg-gray-100 text-gray-700',
    running: 'bg-amber-100 text-amber-700',
    success: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    completed: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    not_started: 'bg-gray-100 text-gray-700',
  };
  
  return colors[status?.toLowerCase()] || colors.idle;
};

export const getStatusPulse = (status) => {
  const pulses = {
    running: 'pulse-running',
    success: 'pulse-success',
    failed: 'pulse-failed',
  };
  
  return pulses[status?.toLowerCase()] || '';
};
