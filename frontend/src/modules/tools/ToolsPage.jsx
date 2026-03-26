import { useEffect, useState } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import { toolService } from '../../services/toolService';
import ToolAssignmentModal from './components/ToolAssignmentModal';
import { Wrench, Users } from 'lucide-react';

export default function ToolsPage() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState(null);
  const [showAssignment, setShowAssignment] = useState(false);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const { data } = await toolService.getAll();
      setTools(data);
    } catch (error) {
      console.error('Failed to load tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = (tool) => {
    setSelectedTool(tool);
    setShowAssignment(true);
  };

  const handleAssignmentSuccess = () => {
    loadTools();
    setShowAssignment(false);
    setSelectedTool(null);
  };

  if (loading) {
    return (
      <PageWrapper title="Tools Management" subtitle="Assign tools to agents">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">Loading...</div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Tools Management"
        subtitle="Predefined tools available for agents"
      >
        <div className="p-8">
          {tools.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <Wrench size={48} className="mx-auto mb-4 text-gray-300" strokeWidth={1} />
              <p className="text-gray-400">No tools available</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <Wrench size={20} className="text-gray-600" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{tool.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{tool.description}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded font-mono">
                          {tool.function_name}
                        </span>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {tool.tool_type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleAssign(tool)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-indigo border border-indigo rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      <Users size={16} strokeWidth={1.5} />
                      Assign to Agents
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageWrapper>

      {/* Tool Assignment Modal */}
      {showAssignment && selectedTool && (
        <ToolAssignmentModal
          tool={selectedTool}
          onClose={() => {
            setShowAssignment(false);
            setSelectedTool(null);
          }}
          onSuccess={handleAssignmentSuccess}
        />
      )}
    </>
  );
}
