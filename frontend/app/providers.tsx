"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// Providers is a client-only wrapper for libraries that need React context.
// Right now it configures TanStack Query, which will later manage backend/API state.
export function Providers({ children }: { children: React.ReactNode }) {
  // QueryClient is created once per browser session.
  // useState prevents creating a new client on every render.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 20 seconds.
            // This keeps the UI calm while WebSocket updates handle realtime changes.
            staleTime: 20_000,
            // Operational dashboards should not surprise users by refetching
            // every time the browser regains focus.
            refetchOnWindowFocus: false
          }
        }
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
