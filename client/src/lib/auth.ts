
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

export async function apiRequest(method: string, url: string, data?: any): Promise<Response> {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
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
