import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client (Phase 2).
 *
 * Catalog data changes rarely, so we keep it fresh for a minute and cache it for
 * a while — pull-to-refresh forces a refetch when the user wants it. Retry is
 * kept modest so a genuinely-down backend surfaces an error state quickly rather
 * than spinning.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min
      gcTime: 5 * 60_000, // 5 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
