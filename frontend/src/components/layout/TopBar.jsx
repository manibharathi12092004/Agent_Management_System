import { useState, useEffect, useRef } from 'react';
import { Bell, Loader2, X, Activity } from 'lucide-react';
import { runHistoryService } from '../../services/runHistoryService';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const ACTIVE_STATUSES = new Set(['IN_PROGRESS', 'RUNNING', 'PENDING', 'NOT_STARTED']);

export default function TopBar({ title, subtitle, actions }) {
  const [open, setOpen]         = useState(false);
  const [activeRuns, setActive] = useState([]);
  const panelRef                = useRef(null);

  // Poll every 10s — only care about active runs
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await runHistoryService.getAll({ limit: 50 });
        const items = Array.isArray(data) ? data : (data.items || data.runs || []);
        setActive(items.filter(r => ACTIVE_STATUSES.has(r.status)));
      } catch { /* silent */ }
    };
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <header className="h-14 flex-shrink-0 bg-white border-b border-gray-100 flex items-center px-6 gap-4">
      {/* Left: title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-[17px] font-semibold text-gray-900 leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
      </div>

      {/* Center: page actions */}
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}

      {/* Right */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-auto" ref={panelRef}>

        {/* Bell */}
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="btn-icon text-gray-400 hover:text-gray-700 hover:bg-gray-100 relative"
          >
            <Bell size={18} strokeWidth={1.75} />
            {activeRuns.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-amber-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-pulse">
                {activeRuns.length > 9 ? '9+' : activeRuns.length}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-10 w-72 bg-white border border-gray-200 rounded-2xl shadow-floating z-50 overflow-hidden animate-fade-in">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-amber-500" strokeWidth={2} />
                  <p className="text-sm font-semibold text-gray-900">Active Runs</p>
                  {activeRuns.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                      {activeRuns.length}
                    </span>
                  )}
                </div>
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>

              {/* Run list */}
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {activeRuns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell size={24} className="text-gray-200 mb-2" strokeWidth={1.5} />
                    <p className="text-xs text-gray-500 font-medium">No active runs</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">All tasks are idle</p>
                  </div>
                ) : activeRuns.map((run) => (
                  <div key={run.id} className="flex items-center gap-3 px-4 py-3 bg-amber-50/50">
                    <Loader2 size={14} className="text-amber-500 flex-shrink-0 animate-spin" strokeWidth={2} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {run.task?.name || 'Task'}
                      </p>
                      {run.schedule?.name && (
                        <p className="text-[10px] text-gray-400 truncate">{run.schedule.name}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Started {timeAgo(run.started_at)}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full uppercase">
                      {run.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
                <a href="/run-history" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">
                  View run history →
                </a>
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
