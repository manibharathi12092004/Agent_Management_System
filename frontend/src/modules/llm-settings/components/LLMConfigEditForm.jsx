import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { llmService } from '../../../services/llmService';

export default function LLMConfigEditForm({ config, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai',
    api_key: '',
    model_name: '',
    base_url: '',
    extra_params: {},
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (config) {
      setFormData({
        name: config.name || '',
        provider: config.provider || 'openai',
        api_key: '', // Don't populate for security
        model_name: config.model_name || '',
        base_url: config.base_url || '',
        extra_params: config.extra_params || {},
      });
    }
  }, [config]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Only send fields that have values
      const updateData = {
        name: formData.name,
        provider: formData.provider,
        model_name: formData.model_name || null,
        base_url: formData.base_url || null,
        extra_params: formData.extra_params,
      };

      // Only include api_key if user entered a new one
      if (formData.api_key) {
        updateData.api_key = formData.api_key;
      }

      await llmService.update(config.id, updateData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleExtraParamChange = (key, value) => {
    setFormData({
      ...formData,
      extra_params: {
        ...formData.extra_params,
        [key]: value,
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit LLM Configuration</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Configuration Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo focus:border-transparent"
              />
            </div>

            {/* Provider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provider *
              </label>
              <select
                required
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo focus:border-transparent"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Google Gemini</option>
                <option value="ollama">Ollama</option>
              </select>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                placeholder="Leave empty to keep current key"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to keep the existing API key
              </p>
            </div>

            {/* Model Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model Name
              </label>
              <input
                type="text"
                value={formData.model_name}
                onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                placeholder="e.g., gpt-4, claude-3-opus"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo focus:border-transparent"
              />
            </div>

            {/* Base URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base URL (Optional)
              </label>
              <input
                type="url"
                value={formData.base_url}
                onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo focus:border-transparent"
              />
            </div>

            {/* Extra Params */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={formData.extra_params.temperature || ''}
                onChange={(e) => handleExtraParamChange('temperature', parseFloat(e.target.value))}
                placeholder="0.7"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo focus:border-transparent"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
