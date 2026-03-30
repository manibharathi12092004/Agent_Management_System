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
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        trigger_type: form.trigger_type,
        cron_expression: form.trigger_type === 'cron' ? form.cron_expression : null,
        trigger_config: {},
        is_active: form.is_active,
        task_ids: form.task_ids,
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
          {form.trigger_type !== 'cron' && form.trigger_type !== 'manual' && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-2">
              {form.trigger_type === 'email' && '📧 Email trigger — coming in a future release.'}
              {form.trigger_type === 'folder_watch' && '📁 Folder watch trigger — coming in a future release.'}
              {form.trigger_type === 'file_watch' && '📄 File watch trigger — coming in a future release.'}
            </p>
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

        {/* Tasks */}
        <div>
          <label className="label">
            {form.trigger_type === 'manual' ? 'Task to Execute (select one)' : 'Tasks to Execute'}
          </label>
          {tasks.length === 0 ? (
            <p className="text-xs text-gray-400">No tasks available. Create tasks first.</p>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {tasks.map(task => {
                const selected = form.task_ids.includes(task.id);
                const disabledByManual = form.trigger_type === 'manual' && !selected && form.task_ids.length >= 1;
                return (
                  <label
                    key={task.id}
                    onClick={() => !disabledByManual && toggleTask(task.id)}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${
                      disabledByManual ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                    } ${selected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className={`w-4 h-4 rounded${form.trigger_type === 'manual' ? '-full' : ''} border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      selected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
                    }`}>
                      {selected && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.name}</p>
                      {task.description && <p className="text-xs text-gray-400 truncate">{task.description}</p>}
                    </div>
                    <span className="text-xs text-gray-400">{task.steps?.length ?? 0} steps</span>
                  </label>
                );
              })}
            </div>
          )}
          {form.task_ids.length > 0 && (
            <p className="text-xs text-indigo-500 mt-1.5">
              {form.trigger_type === 'manual' ? '1 task selected' : `${form.task_ids.length} task(s) selected`}
            </p>
          )}
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          {[
            { key: 'is_active',      label: 'Active',           desc: 'Run automatically on trigger' },
            { key: 'docker_enabled', label: 'Docker Execution', desc: 'Isolated container (coming soon)' },
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
                      className={`border-b border-gray-50 transition-colors ${i % 2 !== 0 ? 'bg-gray-50/30' : ''} ${s.trigger_type === 'manual' ? 'hover:bg-orange-50/40 cursor-pointer' : 'hover:bg-gray-50/60'}`}
                      onClick={s.trigger_type === 'manual' ? () => setManualRunSchedule(s) : undefined}
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        <div className="flex items-center gap-2">
                          {s.name}
                          {s.trigger_type === 'manual' && (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">
                              <Play size={9} fill="currentColor" /> Click to run
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
