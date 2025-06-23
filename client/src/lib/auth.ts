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
export const mockMicrosoftLogin = async (): Promise<{
  email: string;
  name: string;
  microsoftId: string;
}> => {
  // In production, this would use MSAL library
  // For now, return mock data for b.weinreder@nijhuis.nl
  return {
    email: "b.weinreder@nijhuis.nl",
    name: "Bram Weinreder",
    microsoftId: "mock-microsoft-id-123",
  };
};

export const sendEmail = async (to: string[], subject: string, body: string): Promise<void> => {
  // In production, this would use Microsoft Graph API
  const response = await fetch("/api/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ to, subject, body }),
  });

  if (!response.ok) {
    throw new Error("Failed to send email");
  }
};
