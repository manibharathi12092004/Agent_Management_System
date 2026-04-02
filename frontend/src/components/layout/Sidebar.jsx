import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Bot, Wrench, Settings, Workflow,
  Calendar, History, ChevronLeft, ChevronRight,
  Zap,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    ],
  },
  {
    label: 'Build',
    items: [
      { path: '/agents', icon: Bot, label: 'Agents' },
      { path: '/tools', icon: Wrench, label: 'Tools' },
      { path: '/llm-settings', icon: Settings, label: 'LLM Settings' },
    ],
  },
  {
    label: 'Automate',
    items: [
      { path: '/tasks', icon: Workflow, label: 'Tasks' },
      { path: '/scheduler', icon: Calendar, label: 'Scheduler' },
    ],
  },
  {
    label: 'Monitor',
    items: [
      { path: '/run-history', icon: History, label: 'Run History' },
    ],
  },
];

function FlowMindLogo({ collapsed }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-5 border-b border-gray-100 ${collapsed ? 'justify-center px-0' : ''}`}>
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
        <Zap size={16} className="text-white" strokeWidth={2.5} />
      </div>
      {!collapsed && (
        <div className="overflow-hidden">
          <span className="text-sm font-bold text-gray-900 tracking-tight whitespace-nowrap">
            FlowMind <span className="text-indigo-500">AI</span>
          </span>
        </div>
      )}
    </div>
  );
}

function UserBadge({ collapsed }) {
  if (collapsed) return null;
  return (
    <div className="mx-3 mb-4 p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-semibold text-white">AD</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 truncate">Admin User</p>
        <span className="inline-block text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded font-medium">
          Admin
        </span>
      </div>
    </div>
  );
}

function NavItem({ item, collapsed }) {
  const { path, icon: Icon, label, exact } = item;

  return (
    <NavLink
      to={path}
      end={exact}
      className={({ isActive }) =>
        `sidebar-nav-item ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`
      }
      title={collapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          <Icon
            size={18}
            strokeWidth={isActive ? 2 : 1.75}
            className={`flex-shrink-0 ${isActive ? 'text-indigo-500' : 'text-gray-500'}`}
          />
          {!collapsed && (
            <span className="truncate">{label}</span>
          )}
          {/* Tooltip for collapsed state */}
          {collapsed && (
            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg
                            opacity-0 invisible group-hover:opacity-100 group-hover:visible
                            transition-all duration-150 whitespace-nowrap z-50 pointer-events-none shadow-lg">
              {label}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
            </div>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={`
        relative flex flex-col bg-white border-r border-gray-100 h-full flex-shrink-0
        sidebar-transition overflow-hidden
        ${sidebarCollapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Logo */}
      <FlowMindLogo collapsed={sidebarCollapsed} />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4 space-y-5 mt-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!sidebarCollapsed && (
              <p className="section-label">{group.label}</p>
            )}
            {sidebarCollapsed && <div className="my-2 h-px bg-gray-100 mx-2" />}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <div key={item.path} className="group relative">
                  <NavItem item={item} collapsed={sidebarCollapsed} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className={`p-3 border-t border-gray-100 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={toggleSidebar}
          className="btn-icon text-gray-400 hover:text-gray-700 hover:bg-gray-100 w-full flex items-center justify-center"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed
            ? <ChevronRight size={16} strokeWidth={2} />
            : (
              <span className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                <ChevronLeft size={16} strokeWidth={2} />
                Collapse
              </span>
            )
          }
        </button>
      </div>
    </aside>
  );
}
