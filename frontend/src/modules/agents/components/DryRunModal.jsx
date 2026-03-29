import { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { Play, Loader2, Clock, Cpu, CheckCircle, XCircle, Bot } from 'lucide-react';
import { agentService } from '../../../services/agentService';
import { parseMarkdown } from '../../../utils/markdownParser';

const fmt = (ms) => ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;

export default function DryRunModal({ agent, onClose }) {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRun = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const { data } = await agentService.dryRun(agent.id, prompt);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Dry run failed');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">
        {result ? `Completed in ${fmt(result.duration_ms)}` : 'Results appear below after execution'}
      </span>
      <button onClick={onClose} className="btn-secondary btn-sm">Close</button>
    </div>
  );

  return (
    <Modal
      open={!!agent}
      onClose={onClose}
      title="Test Agent"
      subtitle={agent?.name}
      footer={footer}
      width="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Agent info */}
        <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Bot size={16} className="text-indigo-500" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-800">{agent?.name}</p>
            {agent?.description && (
              <p className="text-xs text-indigo-500 mt-0.5 line-clamp-1">{agent.description}</p>
            )}
          </div>
        </div>

        {/* Prompt */}
        <div>
          <label className="label">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="input resize-none font-mono text-sm"
            placeholder="Enter your test prompt..."
            onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleRun(); }}
          />
          <p className="text-xs text-gray-400 mt-1">⌘ + Enter to run</p>
        </div>

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={loading || !prompt.trim()}
          className="btn-primary w-full"
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" /> Running agent...</>
            : <><Play size={15} strokeWidth={2} /> Run Agent</>
          }
        </button>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
            <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div>
              <p className="text-sm font-semibold text-red-800">Execution Failed</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4 animate-fade-in">
            {/* Success header */}
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle size={16} strokeWidth={2.5} />
              <span className="text-sm font-semibold">Execution Successful</span>
            </div>

            {/* Meta cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Clock, label: 'Duration', value: fmt(result.duration_ms) },
                { icon: Cpu,   label: 'Model',    value: result.model_used || 'N/A' },
                { icon: Bot,   label: 'Agent',    value: result.agent_name },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="card p-3">
                  <div className="flex items-center gap-1.5 text-gray-400 mb-1.5">
                    <Icon size={12} strokeWidth={2} />
                    <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
                </div>
              ))}
            </div>

            {/* Output */}
            <div>
              <p className="label">Output</p>
              <div className="card p-5 max-h-80 overflow-y-auto">
                <div
                  className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(result.output) }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
