import { create } from 'zustand';

export const useCanvasStore = create((set) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  
  addNode: (node) => set((state) => ({ 
    nodes: [...state.nodes, node] 
  })),
  
  updateNode: (id, data) => set((state) => ({
    nodes: state.nodes.map((node) =>
      node.id === id ? { ...node, data: { ...node.data, ...data } } : node
    ),
  })),
  
  deleteNode: (id) => set((state) => ({
    nodes: state.nodes.filter((node) => node.id !== id),
    edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
  })),
  
  clearCanvas: () => set({ nodes: [], edges: [], selectedNode: null }),
}));
