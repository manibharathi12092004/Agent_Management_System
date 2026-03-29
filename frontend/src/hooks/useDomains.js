import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { domainService } from '../services/domainService';
import { agentService } from '../services/agentService';

// Get all domains
export function useDomains() {
  return useQuery({
    queryKey: ['domains'],
    queryFn: async () => {
      const { data } = await domainService.getAll();
      return data;
    },
  });
}

// Get single domain
export function useDomain(domainId) {
  return useQuery({
    queryKey: ['domain', domainId],
    queryFn: async () => {
      const { data } = await domainService.getById(domainId);
      return data;
    },
    enabled: !!domainId,
  });
}

// Get agents in a specific domain
export function useDomainAgents(domainId) {
  return useQuery({
    queryKey: ['domain-agents', domainId],
    queryFn: async () => {
      const { data } = await domainService.getDomainAgents(domainId);
      return data;
    },
    enabled: !!domainId,
  });
}

// Suggest domain for new agent
export function useSuggestDomain() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (agentData) => {
      const { data } = await agentService.suggestDomain(agentData);
      return data;
    },
    onSuccess: () => {
      // Invalidate domains to refresh the list
      queryClient.invalidateQueries(['domains']);
    },
  });
}

// Create domain
export function useCreateDomain() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (domainData) => {
      const { data } = await domainService.create(domainData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['domains']);
    },
  });
}

// Delete domain
export function useDeleteDomain() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (domainId) => {
      await domainService.delete(domainId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['domains']);
    },
  });
}
