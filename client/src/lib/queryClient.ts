import { QueryClient } from "@tanstack/react-query";

// Note: Global error handling is done in main.tsx to avoid duplicate listeners

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 401/403 errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      queryFn: async ({ queryKey }) => {
        const [endpoint] = queryKey as [string];
        console.log('Making API request to:', endpoint);
        const result = await apiRequest(endpoint);
        console.log('API response for', endpoint, ':', result);
        return result;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

export async function apiRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  try {
    const init: RequestInit = {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      init.body = JSON.stringify(body);
    }

    const response = await fetch(endpoint, init);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

// Remove the duplicate queryFn setup