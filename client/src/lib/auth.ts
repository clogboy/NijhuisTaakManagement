import { User } from "@shared/schema";

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

export const mockMSALConfig = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || "mock-client-id",
    authority: "https://login.microsoftonline.com/common",
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

export const mockLoginRequest = {
  scopes: ["openid", "profile", "email", "User.Read"],
};

// Mock Microsoft Graph integration for demo purposes
export async function getCurrentUser() {
  try {
    const response = await fetch("/api/auth/me", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to get current user");
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

export async function apiRequest(url: string, method: string = 'GET', data?: any) {
  try {
    console.log(`[API] Making ${method} request to ${url}`);

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include', // Important for sessions
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
      console.log(`[API] Request body:`, data);
    }

    const response = await fetch(url, options);
    console.log(`[API] Response status:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Request failed for ${url}:`, errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error(`[API] Non-JSON response from ${url}:`, responseText);
      throw new Error('Server returned non-JSON response');
    }

    const result = await response.json();
    console.log(`[API] Response body:`, result);
    return result;
  } catch (error) {
    console.error(`[API] Request failed for ${url}:`, error);
    throw error;
  }
}

export async function mockMicrosoftLogin() {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "dev@nijhuis.nl",
        password: "dev",
      }),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Mock Microsoft login error:", error);
    throw error;
  }
}

export async function sendEmail(data: any) {
  try {
    const response = await fetch("/api/emails/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to send email");
    }

    return await response.json();
  } catch (error) {
    console.error("Send email error:", error);
    throw error;
  }
}

export const login = async (email: string, password?: string) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    let data;
    try {
      const text = await response.text();
      console.log('Raw login response:', text);

      // Try to parse as JSON
      if (text.trim().startsWith('{')) {
        data = JSON.parse(text);
      } else {
        console.error('Non-JSON response:', text);
        throw new Error('Server returned invalid response format');
      }
    } catch (parseError) {
      console.error('Failed to parse login response:', parseError);
      throw new Error('Invalid server response');
    }

    if (!response.ok) {
      console.error('Login failed:', response.status, data);
      throw new Error(data?.message || `Login failed: ${response.status}`);
    }

    console.log('Login response:', data);

    if (data.success) {
      return data.user;
    } else {
      throw new Error(data.message || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};