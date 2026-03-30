import { formatDate, formatDuration } from '../../../utils/dateFormatter';
import { Clock, ExternalLink, Calendar, FolderOpen, Mail, Play, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function StatusBadge({ status }) {
  const map = {
    COMPLETED:   { dot: 'status-dot-green',  cls: 'badge-green',  label: 'Completed' },
    RUNNING:     { dot: 'status-dot-amber',  cls: 'badge-amber',  label: 'Running' },
    IN_PROGRESS: { dot: 'status-dot-amber',  cls: 'badge-amber',  label: 'In Progress' },
    FAILED:      { dot: 'status-dot-red',    cls: 'badge-red',    label: 'Failed' },
    PENDING:     { dot: 'status-dot-gray',   cls: 'badge-gray',   label: 'Pending' },
    NOT_STARTED: { dot: 'status-dot-gray',   cls: 'badge-gray',   label: 'Not Started' },
  };
  const s = map[status?.toUpperCase()] || map.NOT_STARTED;
  return (
    <span className={`badge ${s.cls}`}>
      <span className={`status-dot ${s.dot}`} />
      {s.label}
    </span>
  );
}

function TriggerBadge({ type }) {
  const map = {
    cron:         { cls: 'badge-indigo', label: 'Cron' },
    manual:       { cls: 'badge-gray',   label: 'Manual' },
    folder_watch: { cls: 'badge-amber',  label: 'Folder Watch' },
    file_watch:   { cls: 'badge-amber',  label: 'File Watch' },
    email:        { cls: 'badge-blue',   label: 'Email' },
  };
  const t = map[type] || { cls: 'badge-gray', label: type || 'Manual' };
  return <span className={`badge ${t.cls}`}>{t.label}</span>;
}

export default function RecentRunsTable({ runs }) {
  const navigate = useNavigate();

  if (!runs || runs.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <Clock size={40} className="text-gray-200 mb-3" strokeWidth={1.5} />
        <p className="text-sm font-medium text-gray-500">No recent task runs</p>
        <p className="text-xs text-gray-400 mt-1">Runs will appear here once tasks are executed</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Recent Task Runs</h2>
        <button
          onClick={() => navigate('/run-history')}
          className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-600 font-medium transition-colors"
        >
          View all <ExternalLink size={12} strokeWidth={2} />
        </button>
      </div>
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50/60 border-b border-gray-100">
            {['Scheduler', 'Task', 'Trigger', 'Run At', 'Duration', 'Status'].map((h) => (
              <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((run, i) => (
            <tr
              key={run.id}
              className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}
            >
              <td className="px-6 py-3.5 text-sm text-gray-700 font-medium">
                {run.schedule?.name || <span className="text-gray-400 italic">Manual</span>}
              </td>
              <td className="px-6 py-3.5 text-sm text-gray-700">{run.task?.name || '—'}</td>
              <td className="px-6 py-3.5"><TriggerBadge type={run.trigger_type} /></td>
              <td className="px-6 py-3.5 text-sm text-gray-500">{formatDate(run.started_at)}</td>
              <td className="px-6 py-3.5 text-sm text-gray-500">
                {formatDuration(run.started_at, run.completed_at)}
              </td>
              <td className="px-6 py-3.5">
                <StatusBadge status={run.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
