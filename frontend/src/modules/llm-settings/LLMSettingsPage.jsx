import { useEffect, useState } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { toast } from '../../components/ui/Toast';
import { llmService } from '../../services/llmService';
import { Plus, Star, Trash2, Edit, Settings, CheckCircle, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';

const PROVIDERS = {
  openai:    { label: 'OpenAI',    color: 'bg-emerald-500', text: 'text-white', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  gemini:    { label: 'Gemini',    color: 'bg-blue-500',    text: 'text-white', models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
  anthropic: { label: 'Anthropic', color: 'bg-amber-500',   text: 'text-white', models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'] },
  ollama:    { label: 'Ollama',    color: 'bg-gray-700',    text: 'text-white', models: ['llama3', 'mistral', 'codellama'] },
};

function ProviderBadge({ provider }) {
  const p = PROVIDERS[provider] || { label: provider, color: 'bg-gray-400', text: 'text-white' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${p.color} ${p.text}`}>
      {p.label}
    </span>
  );
}

function ConfigForm({ config, onClose, onSuccess }) {
  const isEdit = !!config;
  const [form, setForm] = useState({
    name: config?.name || '',
    provider: config?.provider || 'openai',
    api_key: '',
    model_name: config?.model_name || '',
    base_url: config?.base_url || '',
    is_default: config?.is_default || false,
  });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // 'success' | 'error' | null
  const [testError, setTestError] = useState('');

  const p = PROVIDERS[form.provider];

  const handleSave = async () => {
    if (!form.name || !form.provider) return;
    setSaving(true);
    try {
      if (isEdit) {
        await llmService.update(config.id, form);
        toast.success('Configuration updated');
      } else {
        await llmService.create(form);
        toast.success('Configuration created');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError('');
    try {
      await llmService.testConnection(config?.id);
      setTestResult('success');
    } catch (err) {
      setTestResult('error');
      const detail = err.response?.data?.detail || err.message || 'Connection failed';
      setTestError(detail);
    } finally {
      setTesting(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      {/* Provider selector */}
      <div>
        <label className="label">Provider</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(PROVIDERS).map(([key, val]) => (
            <button
              key={key}
              type="button"
              onClick={() => set('provider', key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                form.provider === key
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${val.color}`} />
              {val.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Configuration Name</label>
        <input className="input" placeholder="e.g. Production Gemini" value={form.name} onChange={(e) => set('name', e.target.value)} />
      </div>

      <div>
        <label className="label">API Key</label>
        <div className="relative">
          <input
            className="input pr-10"
            type={showKey ? 'text' : 'password'}
            placeholder={isEdit ? '••••••••  (leave blank to keep current)' : 'Enter API key'}
            value={form.api_key}
            onChange={(e) => set('api_key', e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div>
        <label className="label">Model</label>
        <input
          className="input"
          placeholder={`e.g. ${p?.models?.[0] || 'model-name'}`}
          value={form.model_name}
          onChange={(e) => set('model_name', e.target.value)}
        />
      </div>

      <div>
        <label className="label">Base URL <span className="text-gray-400 font-normal">(optional)</span></label>
        <input className="input" placeholder="https://api.example.com/v1" value={form.base_url} onChange={(e) => set('base_url', e.target.value)} />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => set('is_default', !form.is_default)}
          className={`w-10 h-5 rounded-full transition-colors relative ${form.is_default ? 'bg-indigo-500' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_default ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </div>
        <span className="text-sm text-gray-700 font-medium">Set as default</span>
      </label>

      {/* Test connection */}
      {isEdit && (
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="btn-secondary btn-sm flex items-center gap-2"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : null}
            Test Connection
          </button>
          {testResult === 'success' && <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle size={14} /> Connected</span>}
          {testResult === 'error'   && (
            <span className="flex items-center gap-1.5 text-xs text-red-500">
              <XCircle size={14} /> Failed
              {testError && <span className="text-red-400">— {testError}</span>}
            </span>
          )}
        </div>
      )}

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full mt-2">
        {saving ? <Loader2 size={16} className="animate-spin" /> : null}
        {isEdit ? 'Update Configuration' : 'Create Configuration'}
      </button>
    </div>
  );
}

export default function LLMSettingsPage() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const { data } = await llmService.getAll();
      setConfigs(data);
    } catch { toast.error('Failed to load configurations'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (c) => { setEditing(c); setSheetOpen(true); };

  const handleDelete = async () => {
    try {
      await llmService.delete(confirm.id);
      toast.success('Configuration deleted');
      load();
    } catch { toast.error('Failed to delete'); }
    finally { setConfirm(null); }
  };

  const handleSetDefault = async (id) => {
    try {
      await llmService.setDefault(id);
      toast.success('Default updated');
      load();
    } catch { toast.error('Failed to set default'); }
  };

  return (
    <>
      <PageWrapper
        title="LLM Settings"
        subtitle="Configure AI model providers"
        actions={
          <button onClick={openCreate} className="btn-primary btn-sm">
            <Plus size={15} strokeWidth={2} /> Add Configuration
          </button>
        }
      >
        <div className="p-6 max-w-6xl mx-auto space-y-6">

          {/* Provider overview cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(PROVIDERS).map(([key, val]) => {
              const count = configs.filter((c) => c.provider === key).length;
              return (
                <div key={key} className="card p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${val.color} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-xs font-bold">{val.label.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{val.label}</p>
                    <p className="text-xs text-gray-400">{count} config{count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Configs table */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Saved Configurations</h2>
              <span className="badge-gray">{configs.length} total</span>
            </div>

            {loading ? (
              <div className="p-6 grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : configs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Settings size={40} className="text-gray-200 mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium text-gray-500">No configurations yet</p>
                <button onClick={openCreate} className="btn-primary btn-sm mt-4">
                  <Plus size={14} /> Add First Configuration
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-gray-100">
                    {['Name', 'Provider', 'Model', 'Default', 'Actions'].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {configs.map((c, i) => (
                    <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${i % 2 !== 0 ? 'bg-gray-50/30' : ''}`}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.name}</td>
                      <td className="px-6 py-4"><ProviderBadge provider={c.provider} /></td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">{c.model_name || '—'}</td>
                      <td className="px-6 py-4">
                        {c.is_default ? (
                          <span className="badge-green"><Star size={10} fill="currentColor" /> Default</span>
                        ) : (
                          <button onClick={() => handleSetDefault(c.id)} className="text-xs text-gray-400 hover:text-indigo-500 transition-colors">
                            Set default
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(c)} className="btn-icon text-gray-400 hover:text-indigo-500 hover:bg-indigo-50">
                            <Edit size={15} strokeWidth={1.75} />
                          </button>
                          <button onClick={() => setConfirm(c)} className="btn-icon text-gray-400 hover:text-red-500 hover:bg-red-50">
                            <Trash2 size={15} strokeWidth={1.75} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </PageWrapper>

      <Modal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Edit Configuration' : 'New LLM Configuration'}
        subtitle={editing ? `Editing ${editing.name}` : 'Connect an AI model provider'}
        width="max-w-xl"
      >
        <ConfigForm config={editing} onClose={() => setSheetOpen(false)} onSuccess={load} />
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title="Delete Configuration"
        message={`Delete "${confirm?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
