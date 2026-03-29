import { Bot, Edit, Trash2, Play, FileText, Wrench } from 'lucide-react';

const PROVIDER_COLORS = {
  openai:    'bg-emerald-100 text-emerald-700',
  gemini:    'bg-blue-100 text-blue-700',
  anthropic: 'bg-amber-100 text-amber-700',
  ollama:    'bg-gray-100 text-gray-700',
};

export default function AgentCard({ agent, onEdit, onDelete, onDryRun }) {
  const providerKey = agent.llm_config?.provider || '';
  const providerCls = PROVIDER_COLORS[providerKey] || 'bg-gray-100 text-gray-600';

  return (
    <div className="gradient-top-border card-hover p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-indigo-50 rounded-xl flex-shrink-0">
          <Bot size={18} className="text-indigo-500" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{agent.name}</h3>
          {agent.description && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{agent.description}</p>
          )}
        </div>
        <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${agent.is_active ? 'bg-emerald-400' : 'bg-gray-300'}`} title={agent.is_active ? 'Active' : 'Inactive'} />
      </div>

      {/* Meta chips */}
      <div className="flex flex-wrap gap-1.5">
        {providerKey && (
          <span className={`badge text-[10px] ${providerCls}`}>{providerKey}</span>
        )}
        {agent.skill_file_path && (
          <span className="badge-gray text-[10px]"><FileText size={9} /> Skill file</span>
        )}
        {agent.tools?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {agent.tools.map((tool) => (
              <span key={tool.id} className="badge-gray text-[10px]">
                <Wrench size={9} /> {tool.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-auto">
        <button onClick={() => onDryRun(agent)} className="btn-secondary btn-sm flex-1">
          <Play size={12} strokeWidth={2} /> Test
        </button>
        <button onClick={() => onEdit(agent)} className="btn-primary btn-sm flex-1">
          <Edit size={12} strokeWidth={2} /> Edit
        </button>
        <button onClick={() => onDelete(agent)} className="btn-icon text-gray-400 hover:text-red-500 hover:bg-red-50">
          <Trash2 size={15} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
