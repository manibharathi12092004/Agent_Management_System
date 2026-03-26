import { useState } from 'react';
import { X, Play, Loader2 } from 'lucide-react';
import { agentService } from '../../../services/agentService';

export default function DryRunModal({ agent, onClose }) {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data } = await agentService.dryRun(agent.id, prompt);
      setResult(data);
    } catch (error) {
      console.error('Dry run failed:', error);
      setResult({
        success: false,
        result: error.response?.data?.detail || 'Dry run failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Dry Run Agent</h2>
            <p className="text-sm text-gray-500 mt-1">{agent.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo resize-none"
              placeholder="Enter your test prompt here..."
            />
          </div>

          {/* Run Button */}
          <button
            onClick={handleRun}
            disabled={loading || !prompt.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play size={18} strokeWidth={1.5} />
                Run Agent
              </>
            )}
          </button>

          {/* Result */}
          {result && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Result
              </label>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre className="whitespace-pre-wrap">{result.result || JSON.stringify(result, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
