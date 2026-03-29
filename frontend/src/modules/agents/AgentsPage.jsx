import { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import DomainSidebarList from './components/DomainSidebarList';
import DomainCard from './components/DomainCard';
import AgentForm from './components/AgentForm';
import DryRunModal from './components/DryRunModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { domainService } from '../../services/domainService';
import { agentService } from '../../services/agentService';

export default function AgentsPage() {
  const [domains, setDomains] = useState([]);
  const [selectedDomainId, setSelectedDomainId] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [domainAgents, setDomainAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agentsLoading, setAgentsLoading] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [createDomainId, setCreateDomainId] = useState(null);
  const [dryRunAgent, setDryRunAgent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [highlightedDomainId, setHighlightedDomainId] = useState(null);

  useEffect(() => { loadDomains(); }, []);

  useEffect(() => {
    if (selectedDomainId) loadDomainAgents(selectedDomainId);
  }, [selectedDomainId]);

  const loadDomains = async () => {
    try {
      setLoading(true);
      const { data } = await domainService.getAll();
      const withAgents = await Promise.all(
        data.map(async (d) => {
          try {
            const { data: agents } = await domainService.getDomainAgents(d.id);
            return { ...d, agents };
          } catch { return { ...d, agents: [] }; }
        })
      );
      setDomains(withAgents);
    } catch { toast.error('Failed to load domains'); }
    finally { setLoading(false); }
  };

  const loadDomainAgents = async (domainId) => {
    try {
      setAgentsLoading(true);
      const [{ data: domain }, { data: agents }] = await Promise.all([
        domainService.getById(domainId),
        domainService.getDomainAgents(domainId),
      ]);
      setSelectedDomain(domain);
      setDomainAgents(agents);
    } catch { toast.error('Failed to load agents'); }
    finally { setAgentsLoading(false); }
  };

  const openCreate = (domainId) => { setEditingAgent(null); setSheetOpen(true); setCreateDomainId(domainId || null); };
  const openEdit = (agent) => { setEditingAgent(agent); setSheetOpen(true); };

  const handleFormSuccess = async (result) => {
    const targetDomainId = result?.domainId || null;

    await loadDomains();

    if (result?.isNewDomain && targetDomainId) {
      setHighlightedDomainId(targetDomainId);
      setTimeout(() => setHighlightedDomainId(null), 2500);
    }

    // Always navigate to the domain the agent was placed in
    if (targetDomainId) {
      setSelectedDomainId(targetDomainId);
      loadDomainAgents(targetDomainId);
    } else if (selectedDomainId) {
      loadDomainAgents(selectedDomainId);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await agentService.delete(deleteTarget.id);
      toast.success(`Agent "${deleteTarget.name}" deleted`);
      await loadDomains();
      if (selectedDomainId) loadDomainAgents(selectedDomainId);
    } catch { toast.error('Failed to delete agent'); }
    finally { setDeleteTarget(null); }
  };

  return (
    <>
      <div className="flex h-full overflow-hidden">
        {/* Domain sidebar */}
        <DomainSidebarList
          domains={domains}
          selectedDomainId={selectedDomainId}
          onDomainSelect={setSelectedDomainId}
          onAgentSelect={openEdit}
          onCreateAgent={openCreate}
          highlightedDomainId={highlightedDomainId}
        />

        {/* Main content */}
        <div className="flex-1 overflow-hidden bg-surface">
          {/* Top bar */}
          <div className="h-14 bg-white border-b border-gray-100 flex items-center px-6">
            <h1 className="text-[17px] font-semibold text-gray-900">Agent Management</h1>
            <p className="text-xs text-gray-400 ml-3">Domain-organized AI agents</p>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100% - 56px)' }}>
            <DomainCard
              domain={selectedDomain}
              agents={domainAgents}
              loading={agentsLoading}
              onEditAgent={openEdit}
              onDeleteAgent={setDeleteTarget}
              onDryRunAgent={setDryRunAgent}
              onCreateAgent={openCreate}
            />
          </div>
        </div>
      </div>

      {/* Agent form sheet */}
      <AgentForm
        open={sheetOpen}
        agent={editingAgent}
        preselectedDomainId={createDomainId}
        preselectedDomainName={createDomainId ? domains.find(d => d.id === createDomainId)?.name : null}
        onClose={() => { setSheetOpen(false); setEditingAgent(null); setCreateDomainId(null); }}
        onSuccess={handleFormSuccess}
      />

      {/* Dry run modal */}
      {dryRunAgent && (
        <DryRunModal
          agent={dryRunAgent}
          onClose={() => setDryRunAgent(null)}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Agent"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
