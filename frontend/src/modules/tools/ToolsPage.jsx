import { useEffect, useState } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { toast } from '../../components/ui/Toast';
import { toolService } from '../../services/toolService';
import { agentService } from '../../services/agentService';
import { Wrench, Users, Check, Loader2, ChevronRight, X } from 'lucide-react';

function ToolCard({ tool, selected, onClick }) {
  const typeColors = {
    filesystem: 'bg-indigo-50 text-indigo-600',
    web:        'bg-blue-50 text-blue-600',
    default:    'bg-gray-100 text-gray-600',
  };
  const tc = typeColors[tool.tool_type] || typeColors.default;

  return (
    <div
      onClick={() => onClick(tool)}
      className={`card-hover p-5 cursor-pointer transition-all ${
        selected ? 'ring-2 ring-indigo-500 border-indigo-200' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-xl ${tc} flex-shrink-0`}>
          <Wrench size={18} strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">{tool.name}</h3>
            <span className="badge-gray font-mono text-[10px]">{tool.function_name}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tool.description}</p>

          {tool.default_params?.actions?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tool.default_params.actions.map((a, i) => (
                <div key={i} className="group relative">
                  <span className="badge-indigo text-[10px] cursor-default">{a.id}</span>
                  {a.description && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg
                                    opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-10 shadow-lg">
                      {a.description}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {selected && (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
            <Check size={11} className="text-white" strokeWidth={3} />
          </div>
        )}
      </div>
    </div>
  );
}

function AssignmentPanel({ tool, agents, onClose, onSuccess }) {
  const initialSelected = new Set(
    agents.filter((a) => a.tools?.some((t) => t.id === tool.id)).map((a) => a.id)
  );
  const [selected, setSelected] = useState(new Set(initialSelected));
  const [saving, setSaving] = useState(false);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      // Diff: which agents to assign vs unassign
      const toAssign   = agents.filter((a) =>  selected.has(a.id) && !initialSelected.has(a.id)).map((a) => a.id);
      const toUnassign = agents.filter((a) => !selected.has(a.id) &&  initialSelected.has(a.id)).map((a) => a.id);

      if (toAssign.length === 0 && toUnassign.length === 0) {
        toast.info('No changes to save');
        onClose();
        return;
      }

      await Promise.all([
        toAssign.length   > 0 ? toolService.assignAgents(tool.id, toAssign)     : Promise.resolve(),
        toUnassign.length > 0 ? toolService.unassignAgents(tool.id, toUnassign) : Promise.resolve(),
      ]);

      const parts = [];
      if (toAssign.length)   parts.push(`assigned to ${toAssign.length}`);
      if (toUnassign.length) parts.push(`unassigned from ${toUnassign.length}`);
      toast.success(`"${tool.name}" ${parts.join(', ')} agent(s)`);
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update assignment');
    } finally {
      setSaving(false);
    }
  };

  const grouped = agents.reduce((acc, agent) => {
    const key = agent.domain_name || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(agent);
    return acc;
  }, {});

  const allSelected = agents.length > 0 && agents.every((a) => selected.has(a.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(agents.map((a) => a.id)));

  const assignCount   = agents.filter((a) =>  selected.has(a.id) && !initialSelected.has(a.id)).length;
  const unassignCount = agents.filter((a) => !selected.has(a.id) &&  initialSelected.has(a.id)).length;
  const hasChanges    = assignCount > 0 || unassignCount > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Manage Assignment</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            <span className="font-medium text-indigo-600">{tool.name}</span>
          </p>
        </div>
        <button onClick={onClose} className="btn-icon text-gray-400 hover:text-gray-700 hover:bg-gray-100">
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Select all */}
      {agents.length > 0 && (
        <button
          onClick={toggleAll}
          className="flex items-center gap-2 px-3 py-2 mb-3 text-xs font-medium text-gray-600
                     bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors w-full"
        >
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            allSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
          }`}>
            {allSelected && <Check size={10} className="text-white" strokeWidth={3} />}
          </div>
          {allSelected ? 'Deselect all' : 'Select all'} ({agents.length})
        </button>
      )}

      {/* Agent list grouped by domain */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Users size={28} className="text-gray-200 mb-2" strokeWidth={1.5} />
            <p className="text-sm text-gray-400">No agents available</p>
          </div>
        ) : (
          Object.entries(grouped).map(([domain, domainAgents]) => (
            <div key={domain}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-1 mb-1.5">
                {domain}
              </p>
              <div className="space-y-0.5">
                {domainAgents.map((agent) => {
                  const isChecked  = selected.has(agent.id);
                  const wasAssigned = initialSelected.has(agent.id);
                  const willAssign   =  isChecked && !wasAssigned;
                  const willUnassign = !isChecked &&  wasAssigned;

                  return (
                    <div
                      key={agent.id}
                      onClick={() => toggle(agent.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
                      }`}>
                        {isChecked && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isChecked ? 'text-indigo-700' : 'text-gray-800'}`}>
                          {agent.name}
                        </p>
                        {agent.tools?.length > 0 && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {agent.tools.length} tool{agent.tools.length > 1 ? 's' : ''} assigned
                          </p>
                        )}
                      </div>
                      {/* Change indicator */}
                      {willAssign && (
                        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-medium">
                          + assign
                        </span>
                      )}
                      {willUnassign && (
                        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 rounded font-medium">
                          − remove
                        </span>
                      )}
                      {wasAssigned && !willUnassign && (
                        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded font-medium">
                          assigned
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-100 mt-4 space-y-2">
        {hasChanges && (
          <div className="flex items-center gap-3 text-xs px-1">
            {assignCount   > 0 && <span className="text-indigo-600">+{assignCount} to assign</span>}
            {unassignCount > 0 && <span className="text-red-500">−{unassignCount} to remove</span>}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`w-full btn ${hasChanges ? 'btn-primary' : 'btn-secondary opacity-60 cursor-not-allowed'}`}
        >
          {saving
            ? <><Loader2 size={15} className="animate-spin" /> Saving...</>
            : hasChanges
              ? <><Check size={15} strokeWidth={2.5} /> Save Changes</>
              : 'No changes'
          }
        </button>
      </div>
    </div>
  );
}

export default function ToolsPage() {
  const [tools, setTools] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [{ data: t }, { data: a }] = await Promise.all([
        toolService.getAll(),
        agentService.getAll(),
      ]);
      setTools(t);
      setAgents(a);
    } catch { toast.error('Failed to load tools'); }
    finally { setLoading(false); }
  };

  return (
    <PageWrapper title="Tools Management" subtitle="Assign predefined tools to agents">
      <div className="flex h-full overflow-hidden">

        {/* Left: tool list */}
        <div className={`flex-1 overflow-y-auto p-6 transition-all ${selectedTool ? 'pr-3' : ''}`}>
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : tools.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Wrench size={40} className="text-gray-200 mb-3" strokeWidth={1.5} />
              <p className="text-sm text-gray-500">No tools available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {tools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  selected={selectedTool?.id === tool.id}
                  onClick={(t) => setSelectedTool(selectedTool?.id === t.id ? null : t)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: assignment panel */}
        {selectedTool && (
          <div className="w-80 flex-shrink-0 border-l border-gray-100 bg-white p-5 overflow-y-auto animate-slide-in-right">
            <AssignmentPanel
              tool={selectedTool}
              agents={agents}
              onClose={() => setSelectedTool(null)}
              onSuccess={() => { load(); setSelectedTool(null); }}
            />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
