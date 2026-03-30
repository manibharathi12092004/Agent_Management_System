import { useState, useEffect } from 'react';
import { Plus, ListTodo, Bot, Edit2 } from 'lucide-react';
import { Skeleton } from '../../../components/ui/Skeleton';
import { taskService } from '../../../services/taskService';

export default function TaskSidebarList({ onNew, onSelect, onEdit, selectedId, refreshKey }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    taskService.getAll()
      .then(res => { if (!cancelled) setTasks(res.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  return (
    <div className="flex flex-col h-full w-60 border-r border-gray-100 bg-white flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tasks</span>
        <button
          onClick={onNew}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
        >
          <Plus size={13} strokeWidth={2.5} /> New
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading ? (
          <div className="space-y-1 px-2 pt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2.5">
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-4 w-8 rounded-full" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <ListTodo size={24} strokeWidth={1.5} className="mb-2" />
            <span className="text-xs">No tasks yet</span>
          </div>
        ) : (
          tasks.map(task => {
            const agentCount = task.steps?.length ?? 0;
            const isSelected = selectedId === task.id;
            return (
              <div
                key={task.id}
                className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-indigo-50 border-r-2 border-indigo-500'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onSelect(task)}
              >
                {/* Task name */}
                <span className={`text-sm flex-1 break-words ${
                  isSelected ? 'text-indigo-700 font-semibold' : 'text-gray-700'
                }`}>
                  {task.name}
                </span>

                {/* Agent count badge */}
                <span className={`flex items-center gap-1 flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                }`}>
                  <Bot size={9} strokeWidth={2} />
                  {agentCount}
                </span>

                {/* Edit button — visible on hover */}
                <button
                  onClick={e => { e.stopPropagation(); onEdit(task); }}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-indigo-100 text-gray-400 hover:text-indigo-500 transition-all"
                  title="Edit task"
                >
                  <Edit2 size={12} strokeWidth={2} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
