import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import StatsCard from './components/StatsCard';
import RecentRunsTable from './components/RecentRunsTable';
import { SkeletonStats, SkeletonRow } from '../../components/ui/Skeleton';
import apiClient from '../../services/api';
import { Bot, Workflow, Calendar, Activity, Plus, ArrowRight } from 'lucide-react';

function QuickAction({ icon: Icon, label, desc, onClick, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
  };
  return (
    <button
      onClick={onClick}
      className="group card-hover p-5 text-left flex items-center gap-4 w-full"
    >
      <div className={`p-3 rounded-xl transition-colors ${colors[color]}`}>
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" strokeWidth={2} />
    </button>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    try {
      const { data } = await apiClient.get('/dashboard/stats');
      setStats(data);
    } catch {
      setStats({ agent_count: 0, task_count: 0, schedule_count: 0, recent_runs: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper title="Dashboard" subtitle="FlowMind AI — Overview">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonStats key={i} />)
          ) : (
            <>
              <StatsCard icon={Bot}      label="Agents"    value={stats?.agent_count    || 0} color="indigo"  onClick={() => navigate('/agents')} />
              <StatsCard icon={Workflow} label="Tasks"     value={stats?.task_count     || 0} color="coral"   onClick={() => navigate('/tasks')} />
              <StatsCard icon={Calendar} label="Schedules" value={stats?.schedule_count || 0} color="emerald" onClick={() => navigate('/scheduler')} />
              <StatsCard icon={Activity} label="Total Runs" value={stats?.total_runs || 0} color="amber" onClick={() => navigate('/run-history')} />
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <QuickAction icon={Bot}      label="Create Agent"    desc="Build a new AI agent with skills & tools" color="indigo"  onClick={() => navigate('/agents')} />
            <QuickAction icon={Workflow} label="Build Workflow"  desc="Design a multi-agent task workflow"       color="emerald" onClick={() => navigate('/tasks')} />
            <QuickAction icon={Calendar} label="Add Schedule"    desc="Automate workflows with cron triggers"    color="amber"   onClick={() => navigate('/scheduler')} />
          </div>
        </div>

        {/* Recent Runs */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Runs</h2>
          {loading ? (
            <div className="card overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : (
            <RecentRunsTable runs={stats?.recent_runs || []} />
          )}
        </div>

      </div>
    </PageWrapper>
  );
}
