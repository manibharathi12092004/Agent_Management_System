import { TrendingUp } from 'lucide-react';

const ACCENT = {
  indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-500',  border: 'border-l-indigo-500' },
  coral:   { bg: 'bg-red-50',     icon: 'text-n8n-coral',   border: 'border-l-red-400' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-500', border: 'border-l-emerald-500' },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-500',   border: 'border-l-amber-500' },
};

export default function StatsCard({ icon: Icon, label, value, color = 'indigo', onClick }) {
  const c = ACCENT[color] || ACCENT.indigo;

  return (
    <div
      onClick={onClick}
      className={`card-hover p-6 cursor-pointer border-l-4 ${c.border} animate-fade-in`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${c.bg}`}>
          <Icon size={22} className={c.icon} strokeWidth={1.75} />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-3 text-xs text-emerald-600">
        <TrendingUp size={12} strokeWidth={2} />
        <span className="font-medium">View all</span>
      </div>
    </div>
  );
}
