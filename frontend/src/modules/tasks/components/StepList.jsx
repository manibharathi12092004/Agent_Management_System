import { useState, useRef } from 'react';
import { GripVertical, Settings, X } from 'lucide-react';

export default function StepList({ steps, llmConfigs = [], onReorder, onLLMOverride, onRemove }) {
  const [openOverride, setOpenOverride] = useState(null); // step index with open panel
  const dragIndex = useRef(null);

  const handleDragStart = (e, index) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === index) return;

    const reordered = [...steps];
    const [moved] = reordered.splice(dragIndex.current, 1);
    reordered.splice(index, 0, moved);
    dragIndex.current = index;
    onReorder(reordered.map((s, i) => ({ ...s, step_order: i + 1 })));
  };

  const handleDragEnd = () => { dragIndex.current = null; };

  if (steps.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
        No steps yet — use Auto Workflow or Manual Workflow to add agents
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {steps.map((step, index) => (
        <div
          key={`${step.agent_id}-${index}`}
          draggable
          onDragStart={e => handleDragStart(e, index)}
          onDragOver={e => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className="border border-gray-200 rounded-lg bg-white overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2">
            {/* Drag handle */}
            <GripVertical size={14} className="text-gray-300 cursor-grab flex-shrink-0" />

            {/* Step number */}
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-semibold flex items-center justify-center">
              {index + 1}
            </span>

            {/* Agent name */}
            <span className="flex-1 text-sm text-gray-800 truncate">{step.agent_name}</span>

            {/* LLM override indicator */}
            {step.llm_override_id && (
              <span className="text-xs text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                LLM ↗
              </span>
            )}

            {/* Settings toggle */}
            <button
              onClick={() => setOpenOverride(openOverride === index ? null : index)}
              className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                openOverride === index ? 'text-indigo-500' : 'text-gray-400'
              }`}
            >
              <Settings size={13} strokeWidth={2} />
            </button>

            {/* Remove */}
            <button
              onClick={() => onRemove(index)}
              className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
            >
              <X size={13} strokeWidth={2} />
            </button>
          </div>

          {/* Inline LLM Override Panel */}
          {openOverride === index && (
            <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                LLM Override (optional)
              </label>
              <select
                value={step.llm_override_id || ''}
                onChange={e => onLLMOverride(index, e.target.value || null)}
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
              >
                <option value="">Use agent default</option>
                {llmConfigs.map(cfg => (
                  <option key={cfg.id} value={cfg.id}>
                    {cfg.name} ({cfg.provider})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
