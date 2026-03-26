import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import StatsCard from './components/StatsCard';
import RecentRunsTable from './components/RecentRunsTable';
import apiClient from '../../services/api';
import { Bot, Workflow, Calendar, Clock } from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data } = await apiClient.get('/dashboard/stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      // Set default values for demo
      setStats({
        agent_count: 0,
        task_count: 0,
        schedule_count: 0,
        recent_runs: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">Loading dashboard...</div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <StatsCard
            icon={Bot}
            label="Agents"
            value={stats?.agent_count || 0}
            color="indigo"
            onClick={() => navigate('/agents')}
          />
          <StatsCard
            icon={Workflow}
            label="Tasks"
            value={stats?.task_count || 0}
            color="n8n-coral"
            onClick={() => navigate('/tasks')}
          />
          <StatsCard
            icon={Calendar}
            label="Schedules"
            value={stats?.schedule_count || 0}
            color="green"
            onClick={() => navigate('/scheduler')}
          />
          <StatsCard
            icon={Clock}
            label="Recent Runs"
            value={stats?.recent_runs?.length || 0}
            color="blue"
            onClick={() => navigate('/run-history')}
          />
        </div>

        {/* Recent Runs Table */}
        <RecentRunsTable runs={stats?.recent_runs || []} />
      </div>
    </PageWrapper>
  );
}
