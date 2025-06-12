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
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      try {
        // In production, this would use MSAL library
        const microsoftUser = await mockMicrosoftLogin();
        
        const response = await apiRequest("/api/auth/login", "POST", microsoftUser);
        return await response.json();
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      toast({
        title: "Welcome!",
        description: `Successfully signed in as ${data.user.name}`,
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Sign In Failed",
        description: error.message || "Failed to sign in with Microsoft",
        variant: "destructive",
      });
    },
  });

  const handleMicrosoftLogin = () => {
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
              disabled={isLoading}
              className="w-full bg-ms-blue hover:bg-ms-blue-dark text-white py-3 font-medium"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Bezig met inloggen...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 21 21">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                    <rect x="12" y="1" width="9" height="9" fill="#00a4ef"/>
                    <rect x="1" y="12" width="9" height="9" fill="#ffb900"/>
                    <rect x="12" y="12" width="9" height="9" fill="#7fba00"/>
                  </svg>
                  {t("login.microsoftSignIn")}
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
