import { useState, useEffect, useRef } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Sheet from '../../components/ui/Sheet';
import { SkeletonRow } from '../../components/ui/Skeleton';
import { formatDate, formatDuration } from '../../utils/dateFormatter';
import { FileText, RefreshCw, Radio } from 'lucide-react';

const MOCK_RUNS = [
  { id: '1', schedule: { name: 'Daily Report' },   task: { name: 'Sales Analysis' },    started_at: new Date(Date.now() - 3600000).toISOString(), completed_at: new Date(Date.now() - 3540000).toISOString(), status: 'COMPLETED',   log_output: '[INFO] Starting Sales Analysis workflow\n[INFO] Agent: Research Agent initialized\n[INFO] Fetching sales data...\n[SUCCESS] Data fetched: 1,234 records\n[INFO] Running analysis...\n[SUCCESS] Analysis complete\n[INFO] Generating report...\n[SUCCESS] Report saved to /output/sales_report.pdf' },
  { id: '2', schedule: { name: 'Weekly Digest' },  task: { name: 'Content Summary' },   started_at: new Date(Date.now() - 7200000).toISOString(), completed_at: null,                                              status: 'IN_PROGRESS', log_output: '[INFO] Starting Content Summary workflow\n[INFO] Fetching articles...\n[INFO] Processing 45 articles...' },
  { id: '3', schedule: null,                        task: { name: 'Data Pipeline' },     started_at: new Date(Date.now() - 86400000).toISOString(), completed_at: new Date(Date.now() - 86340000).toISOString(), status: 'FAILED',      log_output: '[INFO] Starting Data Pipeline\n[INFO] Connecting to database...\n[ERROR] Connection timeout after 30s\n[ERROR] Failed to connect to PostgreSQL\n[FATAL] Workflow aborted' },
  { id: '4', schedule: { name: 'Daily Report' },   task: { name: 'Email Processor' },   started_at: new Date(Date.now() - 172800000).toISOString(), completed_at: new Date(Date.now() - 172740000).toISOString(), status: 'COMPLETED',  log_output: '[INFO] Email processor started\n[INFO] Found 12 new emails\n[SUCCESS] Processed all emails' },
  { id: '5', schedule: null,                        task: { name: 'Market Research' },   started_at: null,                                            completed_at: null,                                              status: 'NOT_STARTED', log_output: '' },
];

const STATUS_MAP = {
  COMPLETED:   { dot: 'status-dot-green',  badge: 'badge-green',  label: 'Completed' },
  IN_PROGRESS: { dot: 'status-dot-amber',  badge: 'badge-amber',  label: 'In Progress' },
  FAILED:      { dot: 'status-dot-red',    badge: 'badge-red',    label: 'Failed' },
  NOT_STARTED: { dot: 'status-dot-gray',   badge: 'badge-gray',   label: 'Not Started' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status?.toUpperCase()] || STATUS_MAP.NOT_STARTED;
  return (
    <span className={`badge ${s.badge}`}>
      <span className={`status-dot ${s.dot}`} />
      {s.label}
    </span>
  );
}

function colorLine(line) {
  if (line.startsWith('[ERROR]') || line.startsWith('[FATAL]'))
    return <span className="text-red-400">{line}</span>;
  if (line.startsWith('[SUCCESS]'))
    return <span className="text-emerald-400">{line}</span>;
  if (line.startsWith('[INFO]'))
    return <span className="text-blue-300">{line}</span>;
  if (line.startsWith('[WARN]'))
    return <span className="text-amber-400">{line}</span>;
  return <span className="text-gray-300">{line}</span>;
}

function LogViewer({ log }) {
  const lines = (log || '').split('\n').filter(Boolean);
  return (
    <div className="bg-gray-950 rounded-xl p-4 font-mono text-xs leading-relaxed overflow-y-auto h-full min-h-[400px]">
      {lines.length === 0 ? (
        <span className="text-gray-600">No log output available</span>
      ) : lines.map((line, i) => (
        <div key={i} className="flex gap-3">
          <span className="text-gray-600 select-none w-6 text-right flex-shrink-0">{i + 1}</span>
          <span>{colorLine(line)}</span>
        </div>
      ))}
    </div>
  );
}

export default function RunHistoryPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logRun, setLogRun] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const hasInProgress = runs.some((r) => r.status === 'IN_PROGRESS');
    setAutoRefresh(hasInProgress);
    if (hasInProgress) {
      intervalRef.current = setInterval(load, 10000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [runs]);

  const load = async () => {
    try {
      // Use mock data — replace with: const { data } = await apiClient.get('/run-history/');
      await new Promise((r) => setTimeout(r, 600));
      setRuns(MOCK_RUNS);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="p-6">
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100">
                  {['Scheduler', 'Task', 'Run At', 'Duration', 'Status', 'Logs'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={6}><SkeletonRow /></td></tr>
                  ))
                ) : runs.map((run, i) => (
                  <tr
                    key={run.id}
                    className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${i % 2 !== 0 ? 'bg-gray-50/30' : ''}`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">
                      {run.schedule?.name || <span className="text-gray-400 italic text-xs">Manual</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{run.task?.name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(run.started_at)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDuration(run.started_at, run.completed_at)}</td>
                    <td className="px-6 py-4"><StatusBadge status={run.status} /></td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setLogRun(run)}
                        className="btn-ghost btn-sm"
                      >
                        <FileText size={13} strokeWidth={1.75} /> View Log
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && runs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText size={40} className="text-gray-200 mb-3" strokeWidth={1.5} />
                <p className="text-sm text-gray-500">No run history yet</p>
              </div>
            )}
          </div>
        </div>
      </PageWrapper>

      <Sheet
        open={!!logRun}
        onClose={() => setLogRun(null)}
        title="Execution Log"
        subtitle={logRun ? `${logRun.task?.name} — ${formatDate(logRun.started_at)}` : ''}
        width="w-[600px]"
      >
        {logRun && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <StatusBadge status={logRun.status} />
              <span className="text-xs text-gray-400">{formatDuration(logRun.started_at, logRun.completed_at)}</span>
            </div>
            <LogViewer log={logRun.log_output} />
          </div>
        )}
      </Sheet>
    </>
  );
}
