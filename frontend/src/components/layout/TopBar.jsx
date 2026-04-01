import { useState, useEffect, useRef } from 'react';
import { Bell, Loader2, X, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { runHistoryService } from '../../services/runHistoryService';
import { useNavigate } from 'react-router-dom';

const ACTIVE   = new Set(['IN_PROGRESS', 'RUNNING', 'PENDING', 'NOT_STARTED']);
const TERMINAL = new Set(['COMPLETED', 'FAILED']);
const STORAGE_KEY = 'notif_dismissed';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function getDismissed() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
}

function dismissAll(ids) {
  try {
    const existing = getDismissed();
    ids.forEach(id => existing.add(id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing]));
  } catch {}
}

export default function TopBar({ title, subtitle, actions }) {
  const navigate = useNavigate();
  const [open, setOpen]             = useState(false);
  const [activeRuns, setActiveRuns] = useState([]);
  const [completedRuns, setCompleted] = useState([]);
  const panelRef = useRef(null);

  const load = () => {
    runHistoryService.getAll({ limit: 100 }).then(({ data }) => {
      const items = Array.isArray(data) ? data : (data.items || []);
      const dismissed = getDismissed();
      const done = items.filter(r => TERMINAL.has(r.status) && !dismissed.has(r.id));
      setActiveRuns(items.filter(r => ACTIVE.has(r.status)));
      setCompleted(done);
    }).catch(() => {});
  };

  useEffect(() => {
    load(); // initial load
  }, []);

  // Only poll actively when runs are in progress, otherwise check every 30s
  useEffect(() => {
    const interval = activeRuns.length > 0 ? 10000 : 30000;
    const id = setInterval(load, interval);
    return () => clearInterval(id);
  }, [activeRuns.length]);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) closePanel();
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, completedRuns]);

  const handleDismissAll = () => {
    dismissAll(completedRuns.map(r => r.id));
    setCompleted([]);
  };

  const closePanel = () => {
    if (completedRuns.length > 0) handleDismissAll();
    setOpen(false);
  };

  const unread = activeRuns.length + completedRuns.length;

  return (
    <header className="h-14 flex-shrink-0 bg-white border-b border-gray-100 flex items-center px-6 gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-[17px] font-semibold text-gray-900 leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
      </div>

      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}

      <div className="flex items-center gap-2 flex-shrink-0 ml-auto" ref={panelRef}>
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="btn-icon text-gray-400 hover:text-gray-700 hover:bg-gray-100 relative"
          >
            <Bell size={18} strokeWidth={1.75} />
            {unread > 0 && (
              <span className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                activeRuns.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-indigo-500'
              }`}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 rounded-2xl shadow-floating z-50 overflow-hidden animate-fade-in">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Bell size={14} className="text-gray-500" strokeWidth={2} />
                  <p className="text-sm font-semibold text-gray-900">Notifications</p>
                </div>
                <div className="flex items-center gap-2">
                  {completedRuns.length > 0 && (
                    <button onClick={handleDismissAll} className="text-[10px] text-gray-400 hover:text-gray-600 font-medium">
                      Clear all
                    </button>
                  )}
                  <button onClick={closePanel} className="text-gray-400 hover:text-gray-600">
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {/* Active runs */}
                {activeRuns.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-4 pt-3 pb-1">
                      Running now
                    </p>
                    {activeRuns.map(run => (
                      <div key={run.id} className="flex items-center gap-3 px-4 py-2.5 bg-amber-50/60 border-b border-amber-100/50">
                        <Loader2 size={13} className="text-amber-500 flex-shrink-0 animate-spin" strokeWidth={2} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{run.task?.name || 'Task'}</p>
                          {run.schedule?.name && <p className="text-[10px] text-gray-400 truncate">{run.schedule.name}</p>}
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">RUNNING</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Completed notifications */}
                {completedRuns.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-4 pt-3 pb-1">
                      Completed
                    </p>
                    {completedRuns.map(run => (
                      <div key={run.id} className={`px-4 py-3 border-b border-gray-50 ${
                        run.status === 'COMPLETED' ? 'bg-emerald-50/40' : 'bg-red-50/40'
                      }`}>
                        <div className="flex items-start gap-2.5">
                          {run.status === 'COMPLETED'
                            ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                            : <XCircle     size={14} className="text-red-500 flex-shrink-0 mt-0.5"     strokeWidth={2.5} />
                          }
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">
                              {run.task?.name || 'Task'}
                              <span className={`ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                run.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {run.status}
                              </span>
                            </p>
                            {run.schedule?.name && (
                              <p className="text-[10px] text-gray-400 truncate mt-0.5">{run.schedule.name}</p>
                            )}
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {timeAgo(run.completed_at || run.started_at)}
                            </p>
                          </div>
                        </div>
                        {/* View Run History */}
                        <button
                          onClick={() => { navigate('/run-history'); closePanel(); }}
                          className="mt-2 ml-6 flex items-center gap-1 text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
                        >
                          View Run History <ArrowRight size={10} strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty */}
                {activeRuns.length === 0 && completedRuns.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Bell size={24} className="text-gray-200 mb-2" strokeWidth={1.5} />
                    <p className="text-xs text-gray-500 font-medium">All quiet</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">No active or recent runs</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => { navigate('/run-history'); setOpen(false); }}
                  className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                >
                  View all run history <ArrowRight size={11} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
          <span className="text-xs font-semibold text-white">AD</span>
        </div>
      </div>
    </header>
  );
}
