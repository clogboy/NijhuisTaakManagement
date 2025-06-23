import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { mockMicrosoftLogin } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/hooks/useTranslations";

export default function Login() {
  const { t } = useTranslations();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoggingIn, setIsLoggingIn] = useState(false);


  const loginMutation = useMutation({
    mutationFn: async () => {
      if (isLoggingIn) {
        throw new Error('Login already in progress');
      }
      
      setIsLoggingIn(true);
      console.log('[LOGIN] Starting login attempt...');

      try {
        const response = await apiRequest('/api/auth/login', 'POST', {
          email: 'dev@nijhuis.nl',
          name: 'Development User'
        });

        console.log('[LOGIN] Response data:', response);

        if (!response.success) {
          throw new Error(response.message || 'Login failed');
        }

        return response;
      } catch (error) {
        setIsLoggingIn(false);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('[LOGIN] Login successful, updating client state...');

      // Clear any existing queries and set new user data
      queryClient.clear();
      queryClient.setQueryData(["/api/auth/me"], { user: data.user });

      toast({
        title: "Welcome!",
        description: `Successfully signed in as ${data.user?.name || 'User'}`,
      });

      console.log('[LOGIN] Navigating to dashboard...');
      
      // Navigate immediately since login was successful
      setLocation("/");
      setIsLoggingIn(false);
    },
    onError: (error: any) => {
      console.error('[LOGIN] Login mutation error:', error);
      setIsLoggingIn(false);
      
      // Only show error toast if it's not a duplicate request
      if (!error.message?.includes('already in progress')) {
        toast({
          title: "Sign In Failed", 
          description: error.message || "Failed to sign in. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleMicrosoftLogin = () => {
    if (loginMutation.isPending || isLoggingIn) {
      console.log('[LOGIN] Login already in progress, ignoring click');
      return;
    }

    console.log('[LOGIN] Starting new login attempt');
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-light">
      <div className="w-full max-w-md mx-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-ms-blue rounded-2xl flex items-center justify-center mb-4">
              <FolderOpen className="text-white" size={32} />
            </div>
            <CardTitle className="text-2xl font-semibold text-neutral-dark">
              NijFlow
            </CardTitle>
            <p className="text-sm text-neutral-medium mt-2">
              Smart Productivity Platform
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-neutral-dark mb-2">
                {t("login.title")}
              </h2>
              <p className="text-sm text-neutral-medium">
                Gebruik je Microsoft account om toegang te krijgen tot de applicatie
              </p>
            </div>

            <Button
              onClick={handleMicrosoftLogin}
              disabled={loginMutation.isPending || isLoggingIn}
              className="w-full bg-ms-blue hover:bg-ms-blue-dark text-white py-3 font-medium"
            >
              {(loginMutation.isPending || isLoggingIn) ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 21 21">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                    <rect x="12" y="1" width="9" height="9" fill="#00a4ef"/>
                    <rect x="1" y="12" width="9" height="9" fill="#ffb900"/>
                    <rect x="12" y="12" width="9" height="9" fill="#7fba00"/>
                  </svg>
                  Sign in with Microsoft
                </div>
              )}
            </Button>

            <div className="text-center">
              <p className="text-xs text-neutral-medium">
                This application requires Microsoft authentication to access.
                Please ensure you have appropriate permissions to use this system.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-xs text-neutral-medium">
            Having trouble signing in? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}