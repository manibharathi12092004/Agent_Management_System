import { useState } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import { Calendar, Plus, Clock, Mail, Folder, FileText, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { toast } from '../../components/ui/Toast';

const TRIGGER_TYPES = [
  { id: 'cron',         label: 'Cron',         icon: Clock },
  { id: 'email',        label: 'Email',         icon: Mail },
  { id: 'folder_watch', label: 'Folder Watch',  icon: Folder },
  { id: 'file_watch',   label: 'File Watch',    icon: FileText },
];

function humanCron(expr) {
  if (!expr) return '';
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return 'Invalid cron expression';
  const [min, hour, dom, month, dow] = parts;
  if (expr === '* * * * *') return 'Every minute';
  if (min !== '*' && hour !== '*' && dom === '*' && month === '*' && dow === '*')
    return `Daily at ${hour.padStart(2,'0')}:${min.padStart(2,'0')}`;
  if (min === '0' && hour === '0' && dom === '*' && month === '*' && dow === '1')
    return 'Every Monday at midnight';
  if (min === '0' && hour === '0' && dom === '1' && month === '*' && dow === '*')
    return 'First day of every month at midnight';
  return `Cron: ${expr}`;
}

const MOCK_SCHEDULES = [
  { id: '1', name: 'Daily Report',    trigger_type: 'cron', cron_expression: '0 9 * * *',   is_active: true },
  { id: '2', name: 'Weekly Digest',   trigger_type: 'cron', cron_expression: '0 8 * * MON', is_active: false },
  { id: '3', name: 'Email Processor', trigger_type: 'email', cron_expression: null,          is_active: true },
];

function ScheduleListItem({ schedule, selected, onClick }) {
  return (
    <div
      onClick={() => onClick(schedule)}
      className={`
        group px-4 py-3.5 cursor-pointer transition-all border-b border-gray-50
        ${selected ? 'bg-indigo-50' : 'hover:bg-gray-50'}
      `}
      style={selected ? { boxShadow: 'inset 3px 0 0 #6366f1' } : {}}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`status-dot flex-shrink-0 ${schedule.is_active ? 'status-dot-green' : 'status-dot-gray'}`} />
          <span className="text-sm font-semibold text-gray-800 truncate">{schedule.name}</span>
        </div>
        <span className="badge-gray text-[10px] flex-shrink-0">{schedule.trigger_type}</span>
      </div>
      {schedule.cron_expression && (
        <p className="text-xs text-gray-400 mt-1 ml-4 truncate">{humanCron(schedule.cron_expression)}</p>
      )}
    </div>
  );
}

function ScheduleForm({ schedule, onSave }) {
  const [form, setForm] = useState({
    name: schedule?.name || '',
    trigger_type: schedule?.trigger_type || 'cron',
    cron_expression: schedule?.cron_expression || '0 9 * * *',
    is_active: schedule?.is_active ?? true,
    docker_enabled: false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Schedule name is required'); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    toast.success('Schedule saved');
    setSaving(false);
    onSave?.(form);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
      {/* Name */}
      <div>
        <label className="label">Schedule Name</label>
        <input className="input" placeholder="e.g. Daily Report" value={form.name} onChange={(e) => set('name', e.target.value)} />
      </div>

      {/* Trigger type segmented control */}
      <div>
        <label className="label">Trigger Type</label>
        <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl">
          {TRIGGER_TYPES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => set('trigger_type', id)}
              className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
                form.trigger_type === id
                  ? 'bg-white text-indigo-600 shadow-card'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={15} strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cron builder */}
      {form.trigger_type === 'cron' && (
        <div>
          <label className="label">Cron Expression</label>
          <input
            className="input font-mono"
            placeholder="0 9 * * *"
            value={form.cron_expression}
            onChange={(e) => set('cron_expression', e.target.value)}
          />
          {form.cron_expression && (
            <p className="text-xs text-indigo-500 mt-2 flex items-center gap-1.5">
              <Clock size={12} strokeWidth={2} />
              {humanCron(form.cron_expression)}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              { label: 'Every minute', val: '* * * * *' },
              { label: 'Daily 9am',    val: '0 9 * * *' },
              { label: 'Weekly Mon',   val: '0 8 * * MON' },
              { label: 'Monthly 1st',  val: '0 0 1 * *' },
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => set('cron_expression', p.val)}
                className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-600 rounded-lg transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toggles */}
      <div className="space-y-4">
        {[
          { key: 'is_active',       label: 'Active',           desc: 'Enable this schedule to run automatically' },
          { key: 'docker_enabled',  label: 'Docker Execution', desc: 'Run tasks in isolated Docker containers' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between p-4 card rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
            <button
              onClick={() => set(key, !form[key])}
              className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${form[key] ? 'bg-indigo-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
        {saving ? <Loader2 size={15} className="animate-spin" /> : null}
        Save Schedule
      </button>
    </div>
  );
}

export default function SchedulerPage() {
  const [schedules, setSchedules] = useState(MOCK_SCHEDULES);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);

  const handleNew = () => { setSelected(null); setCreating(true); };
  const handleSelect = (s) => { setSelected(s); setCreating(false); };

  return (
    <PageWrapper title="Task Scheduler" subtitle="Automate workflows with cron and event triggers">
      <div className="flex h-full overflow-hidden">

        {/* Left sidebar */}
        <div className="w-72 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Schedules</span>
            <button onClick={handleNew} className="btn-icon text-indigo-500 hover:bg-indigo-50">
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Calendar size={32} className="text-gray-200 mb-2" strokeWidth={1.5} />
                <p className="text-xs text-gray-400">No schedules yet</p>
              </div>
            ) : schedules.map((s) => (
              <ScheduleListItem key={s.id} schedule={s} selected={selected?.id === s.id} onClick={handleSelect} />
            ))}
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 overflow-hidden flex flex-col bg-surface">
          {selected || creating ? (
            <ScheduleForm
              schedule={selected}
              onSave={(data) => {
                if (creating) {
                  const newS = { ...data, id: Date.now().toString() };
                  setSchedules((prev) => [...prev, newS]);
                  setSelected(newS);
                  setCreating(false);
                }
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                <Calendar size={28} className="text-amber-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-gray-700">Select a Schedule</h3>
              <p className="text-sm text-gray-400 mt-2 max-w-xs">
                Choose a schedule from the sidebar or create a new one
              </p>
              <button onClick={handleNew} className="btn-primary btn-sm mt-5">
                <Plus size={14} /> New Schedule
              </button>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
