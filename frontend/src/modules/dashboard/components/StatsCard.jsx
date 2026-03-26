export default function StatsCard({ icon: Icon, label, value, color, onClick }) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    'n8n-coral': 'bg-red-50 text-n8n-coral',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all duration-200"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} strokeWidth={1.5} />
        </div>
        <div>
          <div className="text-3xl font-semibold text-gray-900">{value}</div>
          <div className="text-sm text-gray-500 mt-1">{label}</div>
        </div>
      </div>
    </div>
  );
}
