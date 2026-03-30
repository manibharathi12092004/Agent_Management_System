import { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, FolderOpen, Bot } from 'lucide-react';

export default function DomainSidebarList({
  domains = [],
  selectedDomainId,
  onDomainSelect,
  onAgentSelect,
  onCreateAgent,
  highlightedDomainId,
}) {
  const [expanded, setExpanded] = useState(new Set());

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDomainClick = (domain) => {
    toggle(domain.id);
    onDomainSelect(domain.id);
  };

  return (
    <div className="w-64 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Domains</h2>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {domains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <FolderOpen size={32} className="text-gray-200 mb-2" strokeWidth={1.5} />
            <p className="text-xs text-gray-400">No domains yet</p>
            <p className="text-xs text-gray-300 mt-1">Create an agent to get started</p>
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            {domains.map((domain) => {
              const isExpanded = expanded.has(domain.id);
              const isSelected = selectedDomainId === domain.id;
              const isHighlighted = highlightedDomainId === domain.id;

              return (
                <div key={domain.id}>
                  {/* Domain row */}
                  <div
                    className={`
                      group flex items-center gap-2 px-2 py-2.5 rounded-lg cursor-pointer
                      transition-all duration-150 select-none
                      ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}
                      ${isHighlighted ? 'bg-indigo-100 animate-pulse' : ''}
                    `}
                    style={isSelected ? { boxShadow: 'inset 3px 0 0 #6366f1' } : {}}
                    onClick={() => handleDomainClick(domain)}
                  >
                    {/* Chevron */}
                    <span className="flex-shrink-0 text-gray-400">
                      {isExpanded
                        ? <ChevronDown size={14} strokeWidth={2} />
                        : <ChevronRight size={14} strokeWidth={2} />
                      }
                    </span>

                    {/* Name + count */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-sm font-semibold break-words ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                          {domain.name}
                        </span>
                        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">
                          {domain.agent_count || 0}
                        </span>
                      </div>
                      {domain.description && (
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{domain.description}</p>
                      )}
                    </div>

                    {/* Add agent button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onCreateAgent(domain.id); }}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-indigo-100 text-indigo-500 transition-all"
                      title="Add agent"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Agents list */}
                  {isExpanded && domain.agents?.length > 0 && (
                    <div className="ml-5 mt-0.5 mb-1 space-y-0.5">
                      {domain.agents.map((agent) => (
                        <button
                          key={agent.id}
                          onClick={() => onAgentSelect(agent)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-600
                                     hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors text-left"
                        >
                          <Bot size={12} className="text-gray-400 flex-shrink-0" strokeWidth={1.75} />
                          <span className="break-words">{agent.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={() => onCreateAgent(null)}
          className="btn-primary w-full btn-sm"
        >
          <Plus size={14} strokeWidth={2.5} /> New Agent
        </button>
      </div>
    </div>
  );
}
