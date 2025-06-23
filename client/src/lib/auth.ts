import { User } from "@shared/schema";

let currentUser: User | null = null;

export function setCurrentUser(user: User | null) {
  currentUser = user;
}

export function getCurrentUser(): User | null {
  return currentUser;
}

export function clearCurrentUser() {
  currentUser = null;
}

// API request helper
export async function apiRequest(method: string, url: string, data?: any) {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response;
}

export async function loginUser(credentials?: any): Promise<User> {
  const response = await apiRequest('POST', '/api/auth/login', credentials);
  const data = await response.json();

  if (data.success && data.user) {
    setCurrentUser(data.user);
    return data.user;
  }

  throw new Error('Login failed');
}

export async function logoutUser(): Promise<void> {
  await apiRequest('POST', '/api/auth/logout');
  clearCurrentUser();
}

export async function checkAuthStatus(): Promise<User | null> {
  try {
    const response = await apiRequest('GET', '/api/auth/me');
    const data = await response.json();

    if (data.user) {
      setCurrentUser(data.user);
      return data.user;
    }
  } catch (error) {
    console.error('Auth check failed:', error);
  }

  return null;
}

// Mock Microsoft login for development
export async function mockMicrosoftLogin() {
  const mockUser = {
    id: '1',
    email: 'demo@example.com',
    name: 'Demo User',
    picture: null,
  };

  // Store mock user in session
  localStorage.setItem('user', JSON.stringify(mockUser));
  window.location.href = '/dashboard';
}

// Auth state interface
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

// Email sending function
export async function sendEmail(
  emails: string[],
  subject: string,
  body: string
): Promise<void> {
  const response = await apiRequest('POST', '/api/email/send', {
    emails,
    subject,
    body
  });

  if (!response.ok) {
    throw new Error('Failed to send email');
  }
}

export const logout = async (): Promise<void> => {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

// Placeholder functions to prevent import errors
export const apiRequest = async (url: string, options?: RequestInit) => {
  return fetch(url, options);
};

export const mockMicrosoftLogin = async () => {
  return { success: true };
};

export const sendEmail = async (data: any) => {
  console.log('Email sending not implemented:', data);
  return { success: true };
};