import { useEffect, useState } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import { agentService } from '../../services/agentService';
import DryRunModal from './components/DryRunModal';
import AgentForm from './components/AgentForm';
import { Plus, Bot, Play, FileText, Edit } from 'lucide-react';

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showDryRun, setShowDryRun] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const { data } = await agentService.getAll();
      setAgents(data);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDryRun = (agent) => {
    setSelectedAgent(agent);
    setShowDryRun(true);
  };

  const handleCreate = () => {
    setEditingAgent(null);
    setShowForm(true);
  };

  const handleEdit = (agent) => {
    setEditingAgent(agent);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    loadAgents();
    setShowForm(false);
    setEditingAgent(null);
  };

  if (loading) {
    return (
      <PageWrapper title="Agent Management" subtitle="Create and manage AI agents">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">Loading...</div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Agent Management"
        subtitle="Create and manage AI agents with skills and tools"
        actions={
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <Plus size={18} strokeWidth={1.5} />
            Create Agent
          </button>
        }
      >
        <div className="p-8">
          {agents.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <Bot size={48} className="mx-auto mb-4 text-gray-300" strokeWidth={1} />
              <p className="text-gray-400 mb-4">No agents created yet</p>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-indigo text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                Create Your First Agent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-indigo-50 rounded-lg">
                      <Bot size={24} className="text-indigo" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                      {agent.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {agent.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {agent.skill_file_path && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FileText size={14} />
                        <span>Skill file attached</span>
                      </div>
                    )}
                    {agent.system_prompt && (
                      <div className="text-xs text-gray-500">
                        💬 System prompt configured
                      </div>
                    )}
                    {agent.tools && agent.tools.length > 0 && (
                      <div className="text-xs text-gray-500">
                        🔧 {agent.tools.length} tool{agent.tools.length > 1 ? 's' : ''} assigned
                      </div>
                    )}
                    {agent.llm_config_id && (
                      <div className="text-xs text-gray-500">
                        ⚙️ Custom LLM configured
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleDryRun(agent)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      <Play size={14} strokeWidth={1.5} />
                      Dry Run
                    </button>
                    <button
                      onClick={() => handleEdit(agent)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm text-indigo border border-indigo rounded hover:bg-indigo-50 transition-colors"
                    >
                      <Edit size={14} strokeWidth={1.5} />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageWrapper>

      {/* Dry Run Modal */}
      {showDryRun && selectedAgent && (
        <DryRunModal
          agent={selectedAgent}
          onClose={() => {
            setShowDryRun(false);
            setSelectedAgent(null);
          }}
        />
      )}

      {/* Agent Form Modal */}
      {showForm && (
        <AgentForm
          agent={editingAgent}
          onClose={() => {
            setShowForm(false);
            setEditingAgent(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </>
  );
}
