import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = Array.isArray(queryKey) ? queryKey[0] as string : queryKey as string;
        
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            // Don't redirect here, let components handle it
            throw new Error('Unauthorized');
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      },
      retry: false, // Disable retry to prevent cascading errors
      staleTime: 1 * 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: true,
    },
    mutations: {
      retry: false,
    },
  },
});