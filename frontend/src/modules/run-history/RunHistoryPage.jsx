import { useState, useEffect, useRef } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Modal from '../../components/ui/Modal';
import { SkeletonRow } from '../../components/ui/Skeleton';
import { formatDate } from '../../utils/dateFormatter';
import { FileText, RefreshCw, Radio, Clock, XCircle, Calendar, FolderOpen, Mail, Play } from 'lucide-react';
import apiClient from '../../services/api';

const STATUS_MAP = {
  COMPLETED:   { dot: 'status-dot-green',  badge: 'badge-green',  label: 'Completed' },
  COMPLETED_WITH_ERRORS: { dot: 'status-dot-amber', badge: 'badge-amber', label: 'Partial' },
  IN_PROGRESS: { dot: 'status-dot-amber',  badge: 'badge-amber',  label: 'In Progress' },
  RUNNING:     { dot: 'status-dot-amber',  badge: 'badge-amber',  label: 'Running' },
  FAILED:      { dot: 'status-dot-red',    badge: 'badge-red',    label: 'Failed' },
  PENDING:     { dot: 'status-dot-gray',   badge: 'badge-gray',   label: 'Pending' },
  NOT_STARTED: { dot: 'status-dot-gray',   badge: 'badge-gray',   label: 'Not Started' },
};

const TRIGGER_TABS = [
  { key: 'all',          label: 'All',          icon: Radio },
  { key: 'cron',         label: 'Cron',         icon: Calendar },
  { key: 'manual',       label: 'Manual',       icon: Play },
  { key: 'folder_watch', label: 'Folder Watch', icon: FolderOpen },
  { key: 'file_watch',   label: 'File Watch',   icon: FileText },
  { key: 'email',        label: 'Email',        icon: Mail },
];

function StatusBadge({ status }) {
  const s = STATUS_MAP[status?.toUpperCase()] || STATUS_MAP.NOT_STARTED;
  return (
    <span className={`badge ${s.badge}`}>
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

function fmtDuration(seconds) {
  if (!seconds && seconds !== 0) return '—';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

function colorLine(line) {
  const t = line.trim();
  if (t.startsWith('[FAIL]') || t.startsWith('[ERROR]') || t.startsWith('[FATAL]'))
    return <span className="text-red-400">{line}</span>;
  if (t.startsWith('[OK]') || t.startsWith('[SUCCESS]'))
    return <span className="text-emerald-400">{line}</span>;
  if (t.startsWith('[SKIP]'))
    return <span className="text-gray-500">{line}</span>;
  if (t.startsWith('[PARTIAL]'))
    return <span className="text-amber-400">{line}</span>;
  if (t.startsWith('WORKFLOW:') || t.startsWith('STEPS:'))
    return <span className="text-indigo-300 font-semibold">{line}</span>;
  if (t.startsWith('─'))
    return <span className="text-gray-700">{line}</span>;
  if (t.startsWith('        Output:'))
    return <span className="text-gray-400 italic">{line}</span>;
  if (t.startsWith('        Error:'))
    return <span className="text-red-400 italic">{line}</span>;
  if (t.startsWith('['))
    return <span className="text-blue-300">{line}</span>;
  return <span className="text-gray-300">{line}</span>;
}

function LogViewer({ run }) {
  const log = run?.log_output || '';
  const error = run?.error_message || '';
  const lines = log.split('\n').filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <StatusBadge status={run?.status} />
        {run?.trigger_type && <TriggerBadge type={run.trigger_type} />}
        {run?.duration_seconds != null && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock size={12} strokeWidth={2} />
            {fmtDuration(run.duration_seconds)}
          </span>
        )}
        {run?.started_at && (
          <span className="text-xs text-gray-400">{formatDate(run.started_at)}</span>
        )}
      </div>

      {error && run?.status?.toUpperCase() === 'FAILED' && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
          <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-gray-950 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
          <span className="text-xs text-gray-500 font-mono">execution log</span>
          <span className="text-xs text-gray-600">{lines.length} lines</span>
        </div>
        <div className="p-4 font-mono text-xs leading-relaxed overflow-y-auto max-h-[55vh]">
          {lines.length === 0 ? (
            <span className="text-gray-600">No log output available</span>
          ) : lines.map((line, i) => (
            <div key={i} className="flex gap-3 hover:bg-white/5 px-1 rounded">
              <span className="text-gray-700 select-none w-7 text-right flex-shrink-0 pt-0.5">{i + 1}</span>
              <span className="flex-1 break-all">{colorLine(line)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RunHistoryPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logRun, setLogRun] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [tabCounts, setTabCounts] = useState({});
  const intervalRef = useRef(null);
  const PAGE_SIZE = 50;

  useEffect(() => { setPage(1); }, [activeTab]);
  useEffect(() => { load(); }, [page, activeTab]);
  useEffect(() => { loadTabCounts(); }, []);

  useEffect(() => {
    const hasActive = runs.some(r => ['RUNNING', 'IN_PROGRESS', 'PENDING'].includes(r.status?.toUpperCase()));
    setAutoRefresh(hasActive);
    if (hasActive) {
      intervalRef.current = setInterval(() => { load(); loadTabCounts(); }, 10000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [runs]);

  const loadTabCounts = async () => {
    try {
      // Fetch counts for all tabs in parallel
      const requests = TRIGGER_TABS.map(tab => {
        const params = { limit: 1, offset: 0 };
        if (tab.key !== 'all') params.trigger_type = tab.key;
        return apiClient.get('/run-history/', { params })
          .then(({ data }) => {
            const tot = Array.isArray(data) ? data.length : (data.total || 0);
            return [tab.key, tot];
          })
          .catch(() => [tab.key, 0]);
      });
      const results = await Promise.all(requests);
      setTabCounts(Object.fromEntries(results));
    } catch {
      // silently fail — counts are non-critical
    }
  };

  const load = async () => {
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const params = { limit: PAGE_SIZE, offset };
      if (activeTab !== 'all') params.trigger_type = activeTab;
      const { data } = await apiClient.get('/run-history/', { params });
      // Handle both paginated {items, total} and legacy array response
      const items = Array.isArray(data) ? data : (data.items || []);
      const tot   = Array.isArray(data) ? items.length : (data.total || items.length);
      const pages = Array.isArray(data) ? 1 : (data.total_pages || 1);
      setRuns(items);
      setTotal(tot);
      setTotalPages(pages);
      setTabCounts(prev => ({ ...prev, [activeTab]: tot }));
      setLogRun(prev => prev ? (items.find(r => r.id === prev.id) || prev) : null);
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false);
    }
  };

  const visibleTabs = TRIGGER_TABS;

  // Backend already filters — use runs directly
  const filtered = runs;

  return (
    <>
      <PageWrapper
        title="Run History"
        subtitle="Execution logs and workflow status"
        actions={
          <div className="flex items-center gap-2">
            {autoRefresh && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <Radio size={12} className="animate-pulse" strokeWidth={2} /> Live
              </span>
            )}
            <button onClick={load} className="btn-secondary btn-sm">
              <RefreshCw size={13} strokeWidth={2} /> Refresh
            </button>
          </div>
        }
      >
        <div className="p-6 space-y-4">

          {/* Trigger type tabs */}
          <div className="flex items-center gap-1 border-b border-gray-100">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    active
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={13} strokeWidth={2} />
                  {tab.label}
                  {tabCounts[tab.key] !== undefined && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      active ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tabCounts[tab.key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100">
                  {['Scheduler', 'Task', 'Trigger', 'Run At', 'Duration', 'Status', 'Logs'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={7}><SkeletonRow /></td></tr>
                  ))
                ) : filtered.map((run, i) => (
                  <tr
                    key={run.id}
                    className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${i % 2 !== 0 ? 'bg-gray-50/30' : ''}`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-700 max-w-[160px]">
                      <p className="truncate">{run.schedule?.name || <span className="text-gray-400 italic text-xs">Manual</span>}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-[180px]">
                      <p className="truncate">{run.task?.name || '—'}</p>
                    </td>
                    <td className="px-6 py-4"><TriggerBadge type={run.trigger_type} /></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(run.started_at)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{fmtDuration(run.duration_seconds)}</td>
                    <td className="px-6 py-4"><StatusBadge status={run.status} /></td>
                    <td className="px-6 py-4">
                      <button onClick={() => setLogRun(run)} className="btn-ghost btn-sm">
                        <FileText size={13} strokeWidth={1.75} /> View Log
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText size={40} className="text-gray-200 mb-3" strokeWidth={1.5} />
                <p className="text-sm text-gray-500">No runs for this trigger type</p>
                <p className="text-xs text-gray-400 mt-1">Runs will appear here once schedules execute</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-gray-400">
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} runs
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="btn-secondary btn-sm disabled:opacity-40 disabled:cursor-not-allowed px-2"
                >
                  «
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ‹ Prev
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p;
                  if (totalPages <= 5) {
                    p = i + 1;
                  } else if (page <= 3) {
                    p = i + 1;
                  } else if (page >= totalPages - 2) {
                    p = totalPages - 4 + i;
                  } else {
                    p = page - 2 + i;
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                        p === page
                          ? 'bg-indigo-500 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next ›
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="btn-secondary btn-sm disabled:opacity-40 disabled:cursor-not-allowed px-2"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      </PageWrapper>

      <Modal
        open={!!logRun}
        onClose={() => setLogRun(null)}
        title="Execution Log"
        subtitle={logRun ? `${logRun.task?.name}${logRun.schedule ? ` · ${logRun.schedule.name}` : ''}` : ''}
        width="max-w-3xl"
      >
        {logRun && <LogViewer run={logRun} />}
      </Modal>
    </>
  );
}
