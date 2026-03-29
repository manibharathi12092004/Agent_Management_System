import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function AgentPickerPanel({ agents, selectedAgentIds, onAgentToggle }) {
  // Group agents by domain_name
  const grouped = agents.reduce((acc, agent) => {
    const domain = agent.domain_name || 'Uncategorized';
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(agent);
    return acc;
  }, {});

  const [collapsed, setCollapsed] = useState({});

  const toggleDomain = (domain) =>
    setCollapsed(prev => ({ ...prev, [domain]: !prev[domain] }));

  return (
    <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
      {Object.entries(grouped).map(([domain, domainAgents]) => (
        <div key={domain} className="border border-gray-100 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleDomain(domain)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-xs font-semibold text-gray-600">{domain}</span>
            {collapsed[domain]
              ? <ChevronRight size={13} className="text-gray-400" />
              : <ChevronDown size={13} className="text-gray-400" />
            }
          </button>

          {!collapsed[domain] && (
            <div className="divide-y divide-gray-50">
              {domainAgents.map(agent => (
                <label
                  key={agent.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedAgentIds?.includes(agent.id) ?? false}
                    onChange={() => onAgentToggle({ agent_id: agent.id, agent_name: agent.name })}
                    className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-300"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{agent.name}</p>
                    {agent.description && (
                      <p className="text-xs text-gray-400 truncate">{agent.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      {Object.keys(grouped).length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">No agents available</p>
      )}
    </div>
  );
}
