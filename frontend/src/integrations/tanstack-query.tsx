import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function getContext() {
  // Centralized client — can configure retries, caching here
  const queryClient = new QueryClient();
  return { queryClient };
}

export function Provider({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
