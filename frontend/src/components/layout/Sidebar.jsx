import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  Wrench,
  Bot,
  Workflow,
  Calendar,
  History,
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/llm-settings', icon: Settings, label: 'LLM Settings' },
  { path: '/tools', icon: Wrench, label: 'Tools' },
  { path: '/agents', icon: Bot, label: 'Agents' },
  { path: '/tasks', icon: Workflow, label: 'Tasks' },
  { path: '/scheduler', icon: Calendar, label: 'Scheduler' },
  { path: '/run-history', icon: History, label: 'Run History' },
];

export default function Sidebar() {
  return (
    <aside className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-2">
      {/* Logo */}
      <div className="mb-6 flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo to-n8n-coral">
        <span className="text-white font-bold text-lg">AI</span>
      </div>

      {/* Navigation Icons */}
      {navItems.map(({ path, icon: Icon, label, exact }) => (
        <NavLink
          key={path}
          to={path}
          end={exact}
          className={({ isActive }) =>
            `group relative p-3 rounded-lg transition-all duration-200 hover:bg-gray-50 ${
              isActive ? 'bg-gray-100 text-indigo' : 'text-gray-500'
            }`
          }
        >
          <Icon size={20} strokeWidth={1.5} />
          
          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
            {label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
          </div>
        </NavLink>
      ))}
    </aside>
  );
}
