import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (isLoggingIn) return;

      setIsLoggingIn(true);
      console.log('[LOGIN] Starting demo login...');

      const response = await apiRequest('/api/auth/login', 'POST', {
        email: 'demo@nijhuis.nl'
      });

      if (!response.success) {
        throw new Error(response.message || 'Login failed');
      }

      return response;
    },
    onSuccess: (data) => {
      console.log('[LOGIN] Demo login successful');

      queryClient.clear();
      queryClient.setQueryData(["/api/auth/me"], { user: data.user });

      toast({
        title: "Welcome to NijFlow Demo!",
        description: "You're now logged in as a demo user",
      });

      setLocation("/");
      setIsLoggingIn(false);
    },
    onError: (error: any) => {
      console.error('[LOGIN] Login error:', error);
      setIsLoggingIn(false);

      toast({
        title: "Demo Login Failed", 
        description: "Please try again or check the console for details",
        variant: "destructive",
      });
    },
  });

  const handleDemoLogin = () => {
    if (loginMutation.isPending || isLoggingIn) return;
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
              NijFlow Demo
            </CardTitle>
            <p className="text-sm text-neutral-medium mt-2">
              Smart Productivity Platform
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-neutral-dark mb-2">
                Demo Access
              </h2>
              <p className="text-sm text-neutral-medium">
                Click below to explore the demo environment. 
                Future versions will integrate with Azure AD.
              </p>
            </div>

            <Button
              onClick={handleDemoLogin}
              disabled={loginMutation.isPending || isLoggingIn}
              className="w-full bg-ms-blue hover:bg-ms-blue-dark text-white py-3 font-medium"
            >
              {(loginMutation.isPending || isLoggingIn) ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Loading Demo...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 mr-2" />
                  Enter Demo
                </div>
              )}
            </Button>

            <div className="text-center">
              <p className="text-xs text-neutral-medium">
                This is a demonstration environment. 
                Production deployment will use Azure Active Directory authentication.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}