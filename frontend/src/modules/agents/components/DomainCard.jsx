import { FolderOpen, Loader2, Plus } from 'lucide-react';
import AgentCard from './AgentCard';
import { SkeletonCard } from '../../../components/ui/Skeleton';

export default function DomainCard({ domain, agents = [], loading, onEditAgent, onDeleteAgent, onDryRunAgent, onCreateAgent }) {
  if (loading) {
    return (
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
          <FolderOpen size={28} className="text-indigo-300" strokeWidth={1.5} />
        </div>
        <h3 className="text-base font-semibold text-gray-700">Select a Domain</h3>
        <p className="text-sm text-gray-400 mt-2 max-w-xs">
          Choose a domain from the sidebar to view and manage its agents
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Domain header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{domain.name}</h1>
          {domain.description && (
            <p className="text-sm text-gray-500 mt-1">{domain.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            {agents.length} agent{agents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => onCreateAgent?.(domain.id)} className="btn-primary btn-sm">
          <Plus size={14} strokeWidth={2.5} /> Add Agent
        </button>
      </div>

      {/* Agents grid */}
      {agents.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen size={36} className="text-gray-200 mb-3" strokeWidth={1.5} />
          <p className="text-sm text-gray-400">No agents in this domain</p>
          <button onClick={() => onCreateAgent?.(domain.id)} className="btn-primary btn-sm mt-4">
            <Plus size={14} /> Create First Agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={onEditAgent}
              onDelete={onDeleteAgent}
              onDryRun={onDryRunAgent}
            />
          ))}
        </div>
      )}
    </div>
  );
}
