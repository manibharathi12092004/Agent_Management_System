import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import DashboardPage from './modules/dashboard/DashboardPage';
import LLMSettingsPage from './modules/llm-settings/LLMSettingsPage';
import ToolsPage from './modules/tools/ToolsPage';
import AgentsPage from './modules/agents/AgentsPage';
import TasksPage from './modules/tasks/TasksPage';
import SchedulerPage from './modules/scheduler/SchedulerPage';
import RunHistoryPage from './modules/run-history/RunHistoryPage';

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/llm-settings" element={<LLMSettingsPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/scheduler" element={<SchedulerPage />} />
        <Route path="/run-history" element={<RunHistoryPage />} />
      </Routes>
    </AppShell>
  );
}

export default App;
