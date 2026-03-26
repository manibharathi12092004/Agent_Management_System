import { useEffect, useState } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import { llmService } from '../../services/llmService';
import LLMConfigForm from './components/LLMConfigForm';
import LLMConfigEditForm from './components/LLMConfigEditForm';
import { Plus, Settings, Trash2, Star, Edit } from 'lucide-react';

export default function LLMSettingsPage() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const { data } = await llmService.getAll();
      setConfigs(data);
    } catch (error) {
      console.error('Failed to load LLM configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this LLM configuration?')) return;
    
    try {
      await llmService.delete(id);
      setConfigs(configs.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete config:', error);
      alert('Failed to delete configuration');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await llmService.setDefault(id);
      await loadConfigs(); // Reload to update default status
    } catch (error) {
      console.error('Failed to set default:', error);
      alert('Failed to set as default');
    }
  };

  const handleEdit = (config) => {
    setEditingConfig(config);
    setShowEditForm(true);
  };

  const handleEditSuccess = () => {
    loadConfigs();
    setShowEditForm(false);
    setEditingConfig(null);
  };

  if (loading) {
    return (
      <PageWrapper title="LLM Settings" subtitle="Configure LLM providers">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">Loading...</div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="LLM Settings"
        subtitle="Configure LLM providers (OpenAI, Anthropic, Gemini, Ollama)"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <Plus size={18} strokeWidth={1.5} />
            Add Configuration
          </button>
        }
      >
        <div className="p-8">
          {configs.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <Settings size={48} className="mx-auto mb-4 text-gray-300" strokeWidth={1} />
              <p className="text-gray-400 mb-4">No LLM configurations yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-indigo text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                Add Your First Configuration
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{config.name}</h3>
                      <p className="text-sm text-gray-500 mt-1 capitalize">{config.provider}</p>
                    </div>
                    {config.is_default && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        <Star size={12} fill="currentColor" />
                        Default
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="text-sm">
                      <span className="text-gray-500">Model:</span>
                      <span className="ml-2 text-gray-900">{config.model_name || 'Not set'}</span>
                    </div>
                    {config.base_url && (
                      <div className="text-sm">
                        <span className="text-gray-500">Base URL:</span>
                        <span className="ml-2 text-gray-900 font-mono text-xs">{config.base_url}</span>
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="text-gray-500">API Key:</span>
                      <span className="ml-2 text-gray-900">••••••••</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                    {!config.is_default && (
                      <button
                        onClick={() => handleSetDefault(config.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                      >
                        <Star size={14} strokeWidth={1.5} />
                        Set as Default
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(config)}
                      className="p-1.5 text-indigo hover:bg-indigo-50 rounded transition-colors"
                      title="Edit configuration"
                    >
                      <Edit size={16} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete configuration"
                    >
                      <Trash2 size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageWrapper>

      {/* Create Form Modal */}
      {showForm && (
        <LLMConfigForm
          onClose={() => setShowForm(false)}
          onSuccess={loadConfigs}
        />
      )}

      {/* Edit Form Modal */}
      {showEditForm && editingConfig && (
        <LLMConfigEditForm
          config={editingConfig}
          onClose={() => {
            setShowEditForm(false);
            setEditingConfig(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
