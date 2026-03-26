import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { toolService } from '../../../services/toolService';
import { agentService } from '../../../services/agentService';

export default function ToolAssignmentModal({ tool, onClose, onSuccess }) {
  const [agents, setAgents] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const { data } = await agentService.getAll();
      setAgents(data);
      
      // Pre-select agents that already have this tool
      if (tool.agents) {
        setSelectedAgents(tool.agents.map(a => a.id));
      }
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  };

  const toggleAgent = (agentId) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await toolService.assignToAgents(tool.id, selectedAgents);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign tool to agents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assign Tool to Agents</h2>
            <p className="text-sm text-gray-500 mt-1">{tool.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 mb-4">
                {error}
              </div>
            )}

            <div className="space-y-2">
              {agents.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No agents available. Create an agent first.
                </p>
              ) : (
                agents.map((agent) => (
                  <label
                    key={agent.id}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedAgents.includes(agent.id)
                        ? 'border-indigo bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={selectedAgents.includes(agent.id)}
                        onChange={() => toggleAgent(agent.id)}
                        className="w-4 h-4 text-indigo focus:ring-indigo border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {agent.name}
                        </span>
                        {selectedAgents.includes(agent.id) && (
                          <Check size={14} className="text-indigo" strokeWidth={2} />
                        )}
                      </div>
                      {agent.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {agent.description}
                        </p>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>

            {agents.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  {selectedAgents.length} agent{selectedAgents.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
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
              disabled={loading || agents.length === 0}
              className="px-4 py-2 bg-indigo text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Assigning...' : 'Assign Tool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
