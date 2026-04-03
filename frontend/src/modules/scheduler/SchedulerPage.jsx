import { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { SkeletonRow } from '../../components/ui/Skeleton';
import { toast } from '../../components/ui/Toast';
import { schedulerService } from '../../services/schedulerService';
import { taskService } from '../../services/taskService';
import ManualRunCanvas from './components/ManualRunCanvas';
import {
  Calendar, Plus, Clock, Mail, Folder, FileText, Hand,
  Loader2, Edit2, Trash2, Power, PowerOff, Check, Play,
} from 'lucide-react';

// ── Cron presets ──────────────────────────────────────────────────────
const CRON_PRESETS = [
  { label: 'Every minute',      value: '* * * * *' },
  { label: 'Every hour',        value: '0 * * * *' },
  { label: 'Daily at 9am',      value: '0 9 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Weekly Monday midnight', value: '0 0 * * MON' },
  { label: 'Monthly 1st',       value: '0 0 1 * *' },
  { label: 'Yearly Jan 1st',    value: '0 0 1 1 *' },
];

function humanCron(expr) {
  if (!expr?.trim()) return '';
  const p = expr.trim().split(/\s+/);
  if (p.length !== 5) return 'Invalid expression';
  const [min, hour, dom, month, dow] = p;
  if (expr === '* * * * *') return 'Every minute';
  if (expr === '0 * * * *') return 'Every hour';
  if (min !== '*' && hour !== '*' && dom === '*' && month === '*' && dow === '*')
    return `Daily at ${hour.padStart(2,'0')}:${min.padStart(2,'0')}`;
  if (min === '0' && hour === '0' && dom === '*' && month === '*' && dow === 'MON')
    return 'Every Monday at midnight';
  if (min === '0' && hour === '9' && dom === '*' && month === '*' && dow === '*')
    return 'Daily at 09:00';
  if (min === '0' && hour === '0' && dom === '1' && month === '*' && dow === '*')
    return 'First day of every month at midnight';
  if (min === '0' && hour === '0' && dom === '1' && month === '1' && dow === '*')
    return 'Every year on January 1st at midnight';
  return `Cron: ${expr}`;
}

const TRIGGER_TYPES = [
  { id: 'cron',         label: 'Cron',         icon: Clock },
  { id: 'email',        label: 'Email',         icon: Mail },
  { id: 'folder_watch', label: 'Folder Watch',  icon: Folder },
  { id: 'file_watch',   label: 'File Watch',    icon: FileText },
  { id: 'manual',       label: 'Manual',        icon: Hand },
];

function StatusBadge({ isActive }) {
  return (
    <span className={`flex items-center gap-1.5 text-sm font-semibold px-2 py-0.5 rounded-full ${
      isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function ScheduleForm({ schedule, tasks, onClose, onSuccess }) {
  const isEdit = !!schedule;
  const [form, setForm] = useState({
    name: schedule?.name || '',
    trigger_type: schedule?.trigger_type || 'cron',
    cron_expression: schedule?.cron_expression || '0 9 * * *',
    is_active: schedule?.is_active ?? true,
    task_ids: schedule?.tasks?.map(t => t.id) || [],
    docker_enabled: false,
    trigger_config: schedule?.trigger_config || {},
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleTask = (id) =>
    setForm(f => ({
      ...f,
      task_ids: f.task_ids.includes(id)
        ? f.task_ids.filter(x => x !== id)
        : [...f.task_ids, id],
    }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Schedule name is required'); return; }
    if (form.trigger_type === 'cron' && !form.cron_expression?.trim()) {
      toast.error('Cron expression is required'); return;
    }
    if ((form.trigger_type === 'folder_watch' || form.trigger_type === 'file_watch') && !form.trigger_config?.folder_path?.trim()) {
      toast.error('Folder path is required for watch triggers'); return;
    }
    if (form.trigger_type === 'email') {
      if (!form.trigger_config?.email?.trim()) { toast.error('Email address is required'); return; }
      if (!form.trigger_config?.filter_from?.trim()) { toast.error('Filter from email is required'); return; }
      if (!isEdit && !form.trigger_config?._plaintext_password?.trim()) {
        toast.error('App password is required'); return;
      }
      if (!form.trigger_config?.imap_host?.trim()) { toast.error('IMAP host is required'); return; }
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        trigger_type: form.trigger_type,
        cron_expression: form.trigger_type === 'cron' ? form.cron_expression : null,
        trigger_config: (() => {
          const cfg = { ...form.trigger_config };
          // Remove the plaintext password field — backend handles encryption
          delete cfg._plaintext_password;
          return cfg;
        })(),
        is_active: form.is_active,
        task_ids: form.task_ids,
        // Pass plaintext password separately for backend to encrypt
        email_password: form.trigger_type === 'email' ? form.trigger_config?._plaintext_password : undefined,
      };
      if (isEdit) {
        await schedulerService.update(schedule.id, payload);
        toast.success('Schedule updated');
      } else {
        await schedulerService.create(payload);
        toast.success('Schedule created');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
      {saving ? <Loader2 size={15} className="animate-spin" /> : null}
      {isEdit ? 'Update Schedule' : 'Create Schedule'}
    </button>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit Schedule' : 'New Schedule'}
      subtitle="Configure automated workflow execution"
      footer={footer}
      width="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Name */}
        <div>
          <label className="label">Schedule Name *</label>
          <input className="input" placeholder="e.g. Daily Report" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>

        {/* Trigger type */}
        <div>
          <label className="label">Trigger Type</label>
          <div className="grid grid-cols-5 gap-1.5 p-1 bg-gray-100 rounded-xl">
            {TRIGGER_TYPES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => set('trigger_type', id)}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg text-xs font-medium transition-all ${
                  form.trigger_type === id
                    ? 'bg-white text-indigo-600 shadow-card'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={16} strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </div>
          {form.trigger_type === 'email' && (
            <div className="mt-2 space-y-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Mail size={14} className="text-blue-500" strokeWidth={2} />
                <p className="text-xs font-semibold text-blue-700">Email (IMAP) Configuration</p>
              </div>

              {/* Email address */}
              <div>
                <label className="label">Email Address *</label>
                <input
                  className="input"
                  type="email"
                  placeholder="support@gmail.com"
                  value={form.trigger_config?.email || ''}
                  onChange={e => {
                    const email = e.target.value;
                    // Auto-fill IMAP host based on domain
                    const domain = email.split('@')[1]?.toLowerCase() || '';
                    const hostMap = {
                      'gmail.com': 'imap.gmail.com',
                      'googlemail.com': 'imap.gmail.com',
                      'outlook.com': 'imap-mail.outlook.com',
                      'hotmail.com': 'imap-mail.outlook.com',
                      'live.com': 'imap-mail.outlook.com',
                      'yahoo.com': 'imap.mail.yahoo.com',
                      'yahoo.co.in': 'imap.mail.yahoo.com',
                    };
                    const autoHost = hostMap[domain] || form.trigger_config?.imap_host || '';
                    set('trigger_config', {
                      ...form.trigger_config,
                      email,
                      imap_host: autoHost,
                      imap_port: form.trigger_config?.imap_port || 993,
                    });
                  }}
                />
              </div>

              {/* App password */}
              <div>
                <label className="label">App Password {isEdit ? '(leave blank to keep existing)' : '*'}</label>
                <input
                  className="input font-mono"
                  type="password"
                  placeholder={isEdit ? "Leave blank to keep existing password" : "xxxx-xxxx-xxxx-xxxx"}
                  value={form.trigger_config?._plaintext_password || ''}
                  onChange={e => set('trigger_config', {
                    ...form.trigger_config,
                    _plaintext_password: e.target.value,
                  })}
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Gmail: Google Account → Security → App Passwords. Do NOT use your main password.
                </p>
              </div>

              {/* Filter from email */}
              <div>
                <label className="label">Trigger only from this email address *</label>
                <input
                  className="input"
                  type="email"
                  placeholder="boss@company.com"
                  value={form.trigger_config?.filter_from || ''}
                  onChange={e => set('trigger_config', { ...form.trigger_config, filter_from: e.target.value })}
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Workflow triggers only when a new email arrives from this sender.
                </p>
              </div>

              {/* Filter subject */}
              <div>
                <label className="label">Trigger only if subject contains (optional)</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Invoice, Report, Alert..."
                  value={form.trigger_config?.filter_subject || ''}
                  onChange={e => set('trigger_config', { ...form.trigger_config, filter_subject: e.target.value })}
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Leave empty to trigger on all emails from the sender above.
                </p>
              </div>

              {/* IMAP host + port */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="label">IMAP Host</label>
                  <input
                    className="input font-mono text-sm"
                    placeholder="imap.gmail.com"
                    value={form.trigger_config?.imap_host || ''}
                    onChange={e => set('trigger_config', { ...form.trigger_config, imap_host: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Port</label>
                  <input
                    className="input font-mono text-sm"
                    type="number"
                    placeholder="993"
                    value={form.trigger_config?.imap_port || 993}
                    onChange={e => set('trigger_config', { ...form.trigger_config, imap_port: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <p className="text-[10px] text-blue-600 bg-blue-100 rounded-lg px-3 py-2">
                📬 Polls every 60 seconds for new unread emails. Each new email triggers the workflow.
              </p>
            </div>
          )}
        </div>

        {/* Cron builder */}
        {form.trigger_type === 'cron' && (
          <div>
            <label className="label">Cron Expression</label>
            <input
              className="input font-mono"
              placeholder="0 9 * * *"
              value={form.cron_expression}
              onChange={e => set('cron_expression', e.target.value)}
            />
            {form.cron_expression && (
              <p className="text-xs text-indigo-500 mt-1.5 flex items-center gap-1.5">
                <Clock size={11} strokeWidth={2} />
                {humanCron(form.cron_expression)}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {CRON_PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => set('cron_expression', p.value)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    form.cron_expression === p.value
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Folder Watch config */}
        {form.trigger_type === 'folder_watch' && (
          <div className="space-y-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Folder size={14} className="text-indigo-500" strokeWidth={2} />
              <p className="text-xs font-semibold text-indigo-700">Folder Watch Configuration</p>
            </div>
            <div>
              <label className="label">Watch Folder Path *</label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-200 rounded-l-lg text-xs font-mono text-gray-500 flex-shrink-0">
                  uploads/agent_fs/
                </span>
                <input
                  className="input rounded-l-none font-mono text-sm"
                  placeholder="incoming"
                  value={(form.trigger_config?.folder_path || '').replace(/^\.?\/?uploads\/agent_fs\/?/, '')}
                  onChange={e => set('trigger_config', {
                    ...form.trigger_config,
                    folder_path: `./uploads/agent_fs/${e.target.value.replace(/^\//, '')}`
                  })}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Triggers when any file is created or modified in this folder</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.trigger_config?.recursive || false}
                  onChange={e => set('trigger_config', { ...form.trigger_config, recursive: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-500"
                />
                <span className="text-xs text-gray-600">Watch subdirectories recursively</span>
              </label>
            </div>
          </div>
        )}

        {/* File Watch config */}
        {form.trigger_type === 'file_watch' && (
          <div className="space-y-3 p-4 bg-purple-50/50 border border-purple-100 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={14} className="text-purple-500" strokeWidth={2} />
              <p className="text-xs font-semibold text-purple-700">File Watch Configuration</p>
            </div>
            <div>
              <label className="label">Watch Folder Path *</label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-200 rounded-l-lg text-xs font-mono text-gray-500 flex-shrink-0">
                  uploads/agent_fs/
                </span>
                <input
                  className="input rounded-l-none font-mono text-sm"
                  placeholder="incoming"
                  value={(form.trigger_config?.folder_path || '').replace(/^\.?\/?uploads\/agent_fs\/?/, '')}
                  onChange={e => set('trigger_config', {
                    ...form.trigger_config,
                    folder_path: `./uploads/agent_fs/${e.target.value.replace(/^\//, '')}`
                  })}
                />
              </div>
            </div>
            <div>
              <label className="label">File Types to Watch *</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {['.csv', '.txt', '.pdf', '.json', '.md', '.xlsx', '.xml'].map(ext => {
                  const selected = (form.trigger_config?.file_types || []).includes(ext);
                  return (
                    <button
                      key={ext}
                      type="button"
                      onClick={() => {
                        const current = form.trigger_config?.file_types || [];
                        const updated = selected
                          ? current.filter(e => e !== ext)
                          : [...current, ext];
                        set('trigger_config', { ...form.trigger_config, file_types: updated });
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-mono font-medium border transition-all ${
                        selected
                          ? 'bg-purple-500 text-white border-purple-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      {ext}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">
                Triggers when a file of selected type is created or modified. Select none to watch all files.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.trigger_config?.recursive || false}
                  onChange={e => set('trigger_config', { ...form.trigger_config, recursive: e.target.checked })}
                  className="rounded border-gray-300 text-purple-500"
                />
                <span className="text-xs text-gray-600">Watch subdirectories recursively</span>
              </label>
            </div>
          </div>
        )}

        {/* Tasks */}
        <div>
          <label className="label">
            {form.trigger_type === 'manual' ? 'Task to Execute (select one)' : 'Tasks to Execute (click to set run order)'}
          </label>
          {tasks.length === 0 ? (
            <p className="text-xs text-gray-400">No tasks available. Create tasks first.</p>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {tasks.map(task => {
                const orderIndex = form.task_ids.indexOf(task.id);
                const selected = orderIndex !== -1;
                const order = orderIndex + 1;
                const disabledByManual = form.trigger_type === 'manual' && !selected && form.task_ids.length >= 1;
                return (
                  <div
                    key={task.id}
                    onClick={() => !disabledByManual && toggleTask(task.id)}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${
                      disabledByManual ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                    } ${selected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                  >
                    {/* Order badge or empty circle */}
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[11px] font-bold transition-colors ${
                      selected
                        ? 'bg-indigo-500 border-indigo-500 text-white'
                        : 'border-gray-300 text-gray-400'
                    }`}>
                      {selected ? order : ''}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.name}</p>
                      {task.description && <p className="text-xs text-gray-400 truncate">{task.description}</p>}
                    </div>
                    <span className="text-xs text-gray-400">{task.steps?.length ?? 0} steps</span>
                  </div>
                );
              })}
            </div>
          )}
          {form.task_ids.length > 0 && form.trigger_type !== 'manual' && (
            <p className="text-xs text-indigo-500 mt-1.5">
              {form.task_ids.length} task(s) — runs in order shown above
            </p>
          )}
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          {[
            { key: 'is_active', label: 'Active', desc: 'Run automatically on trigger' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <button
                type="button"
                onClick={() => set(key, !form[key])}
                className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                  form[key] ? 'bg-indigo-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    form[key] ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export default function SchedulerPage() {
  const [schedules, setSchedules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [manualRunSchedule, setManualRunSchedule] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [{ data: s }, { data: t }] = await Promise.all([
        schedulerService.getAll(),
        taskService.getAll(),
      ]);
      setSchedules(s);
      setTasks(t);
    } catch { toast.error('Failed to load schedules'); }
    finally { setLoading(false); }
  };

  const handleToggle = async () => {
    const schedule = toggleTarget;
    setToggleTarget(null);
    try {
      await schedulerService.toggle(schedule.id);
      toast.success(`Schedule ${schedule.is_active ? 'deactivated' : 'activated'}`);
      load();
    } catch { toast.error('Failed to toggle schedule'); }
  };

  const handleDelete = async () => {
    try {
      await schedulerService.remove(deleteTarget.id);
      toast.success('Schedule deleted');
      load();
    } catch { toast.error('Failed to delete schedule'); }
    finally { setDeleteTarget(null); }
  };

  return (
    <>
      <PageWrapper
        title="Task Scheduler"
        subtitle="Automate workflows with cron and event triggers"
        actions={
          <button onClick={() => { setEditingSchedule(null); setShowForm(true); }} className="btn-primary btn-sm">
            <Plus size={14} strokeWidth={2.5} /> New Schedule
          </button>
        }
      >
        <div className="p-6 max-w-6xl mx-auto">
          {loading ? (
            <div className="card overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : schedules.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                <Calendar size={28} className="text-amber-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-gray-700">No schedules yet</h3>
              <p className="text-sm text-gray-400 mt-2 max-w-xs">Create a schedule to automate your workflows</p>
              <button onClick={() => setShowForm(true)} className="btn-primary btn-sm mt-5">
                <Plus size={14} /> New Schedule
              </button>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-gray-100">
                    {['Name', 'Trigger', 'Schedule', 'Tasks', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s, i) => (
                    <tr
                      key={s.id}
                      className={`border-b border-gray-50 transition-colors ${i % 2 !== 0 ? 'bg-gray-50/30' : ''} ${s.trigger_type === 'manual' && s.is_active ? 'hover:bg-orange-50/40 cursor-pointer' : 'hover:bg-gray-50/60'}`}
                      onClick={s.trigger_type === 'manual' && s.is_active ? () => setManualRunSchedule(s) : undefined}
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        <div className="flex items-center gap-2">
                          {s.name}
                          {s.trigger_type === 'manual' && (
                            <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              s.is_active
                                ? 'text-orange-500 bg-orange-50'
                                : 'text-gray-400 bg-gray-100'
                            }`}>
                              <Play size={9} fill="currentColor" />
                              {s.is_active ? 'Click to run' : 'Inactive'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="badge-gray text-sm font-semibold">{s.trigger_type}</span>
                      </td>
                      <td className="px-6 py-4">
                        {s.cron_expression ? (
                          <p className="text-sm font-semibold text-gray-800">{humanCron(s.cron_expression)}</p>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{s.tasks?.length ?? 0} task(s)</td>
                      <td className="px-6 py-4"><div className="flex"><StatusBadge isActive={s.is_active} /></div></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setToggleTarget(s)}
                            className={`btn-icon ${s.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                            title={s.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {s.is_active ? <PowerOff size={15} strokeWidth={1.75} /> : <Power size={15} strokeWidth={1.75} />}
                          </button>
                          <button
                            onClick={() => { setEditingSchedule(s); setShowForm(true); }}
                            className="btn-icon text-gray-400 hover:text-indigo-500 hover:bg-indigo-50"
                          >
                            <Edit2 size={15} strokeWidth={1.75} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(s)}
                            className="btn-icon text-gray-400 hover:text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={15} strokeWidth={1.75} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PageWrapper>

      {showForm && (
        <ScheduleForm
          schedule={editingSchedule}
          tasks={tasks}
          onClose={() => { setShowForm(false); setEditingSchedule(null); }}
          onSuccess={load}
        />
      )}

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.is_active ? 'Deactivate Schedule' : 'Activate Schedule'}
        message={
          toggleTarget?.is_active
            ? `Deactivate "${toggleTarget?.name}"? It will stop running automatically.`
            : `Activate "${toggleTarget?.name}"? It will start running on its cron schedule.`
        }
        danger={!!toggleTarget?.is_active}
        onConfirm={handleToggle}
        onCancel={() => setToggleTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Schedule"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {manualRunSchedule && (
        <ManualRunCanvas
          schedule={manualRunSchedule}
          onClose={() => setManualRunSchedule(null)}
        />
      )}
    </>
  );
}
