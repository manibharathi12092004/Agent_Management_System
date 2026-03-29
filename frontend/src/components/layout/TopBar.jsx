import { Bell } from 'lucide-react';

export default function TopBar({ title, subtitle, actions }) {
  return (
    <header className="h-14 flex-shrink-0 bg-white border-b border-gray-100 flex items-center px-6 gap-4">
      {/* Left: title + breadcrumb */}
      <div className="flex-1 min-w-0">
        <h1 className="text-[17px] font-semibold text-gray-900 leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {/* Center: page actions */}
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}

      {/* Right: notification + avatar */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
        <button className="btn-icon text-gray-400 hover:text-gray-700 hover:bg-gray-100 relative">
          <Bell size={18} strokeWidth={1.75} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
          <span className="text-xs font-semibold text-white">AD</span>
        </div>
      </div>
    </header>
  );
}
