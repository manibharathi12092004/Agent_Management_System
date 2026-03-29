import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import { useUIStore } from '../../store/uiStore';

// Tasks page is full-screen canvas — force sidebar collapsed
const FORCE_COLLAPSED_ROUTES = ['/tasks'];

export default function AppShell({ children }) {
  const location = useLocation();
  const { collapseSidebar } = useUIStore();

  useEffect(() => {
    if (FORCE_COLLAPSED_ROUTES.includes(location.pathname)) {
      collapseSidebar();
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </main>
    </div>
  );
}
