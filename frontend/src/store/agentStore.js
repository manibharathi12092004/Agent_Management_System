import { create } from 'zustand';

export const useAgentStore = create((set) => ({
  agents: [],
  selectedAgent: null,
  loading: false,
  
  setAgents: (agents) => set({ agents }),
  setSelectedAgent: (agent) => set({ selectedAgent: agent }),
  setLoading: (loading) => set({ loading }),
  
  addAgent: (agent) => set((state) => ({ 
    agents: [...state.agents, agent] 
  })),
  
  updateAgent: (id, data) => set((state) => ({
    agents: state.agents.map((agent) =>
      agent.id === id ? { ...agent, ...data } : agent
    ),
  })),
  
  deleteAgent: (id) => set((state) => ({
    agents: state.agents.filter((agent) => agent.id !== id),
  })),
}));
