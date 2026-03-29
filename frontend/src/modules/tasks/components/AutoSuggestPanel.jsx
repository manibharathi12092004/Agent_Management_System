import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { taskService } from '../../../services/taskService';

export default function AutoSuggestPanel({ onStepsGenerated }) {
  const [desc, setDesc] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!desc.trim()) return;
    setGenerating(true);
    setError('');
    try {
      const res = await taskService.autoSuggest(desc.trim());
      onStepsGenerated(res.data.steps ?? []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate suggestions');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-gray-600">
        Describe what this workflow should accomplish
      </label>
      <textarea
        value={desc}
        onChange={e => setDesc(e.target.value)}
        rows={3}
        placeholder="e.g. Research a topic, summarize findings, and draft an email..."
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-400"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={handleGenerate}
        disabled={generating || !desc.trim()}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {generating
          ? <Loader2 size={14} className="animate-spin" />
          : <Sparkles size={14} strokeWidth={2} />
        }
        {generating ? 'Generating...' : 'Generate'}
      </button>
    </div>
  );
}
