
import { toast } from '@/hooks/use-toast';

// Mock user for development
const MOCK_USER = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user'
};

export async function apiRequest(method: string, url: string, data?: any) {
  const isServer = typeof window === 'undefined';
  const baseUrl = isServer ? process.env.API_URL || 'http://localhost:5000' : '';
  
  try {
    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(`${baseUrl}/api${url}`, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    console.error('API request failed:', error);
    
    if (error instanceof Error) {
      toast({
        title: 'API Error',
        description: error.message,
        variant: 'destructive',
      });
    }
    
    throw error;
  }
}

export function getCurrentUser() {
  return MOCK_USER;
}

export function isAuthenticated(): boolean {
  return true; // Always return true for development
}

export async function mockMicrosoftLogin() {
  try {
    localStorage.setItem('user', JSON.stringify(MOCK_USER));
    toast({
      title: 'Success',
      description: 'Successfully logged in with mock user',
    });
    return MOCK_USER;
  } catch (error) {
    console.error('Mock login failed:', error);
    toast({
      title: 'Login Error',
      description: 'Failed to log in',
      variant: 'destructive',
    });
    throw error;
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  activityId?: string
) {
  try {
    const emailData = {
      to,
      subject,
      body,
      activityId
    };

    const result = await apiRequest('POST', '/send-email', emailData);
    
    toast({
      title: 'Email Sent',
      description: `Email sent successfully to ${to}`,
    });
    
    return result;
  } catch (error) {
    console.error('Send email failed:', error);
    toast({
      title: 'Email Error',
      description: 'Failed to send email',
      variant: 'destructive',
    });
    throw error;
  }
}
