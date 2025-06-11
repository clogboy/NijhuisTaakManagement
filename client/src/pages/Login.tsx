import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderOpen } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("b.weinreder@nijhuis.nl");
  const [password, setPassword] = useState("admin123");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      setIsLoading(true);
      try {
        const response = await apiRequest("/api/auth/login", "POST", credentials);
        return await response.json();
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      toast({
        title: "Welkom!",
        description: `Succesvol ingelogd als ${data.user.name}`,
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Inloggen mislukt",
        description: error.message || "Controleer uw inloggegevens",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Incomplete gegevens",
        description: "Vul alle velden in",
        variant: "destructive",
      });
      return;
    }
    
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-light">
      <div className="w-full max-w-md mx-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mb-4">
              <FolderOpen className="text-white" size={32} />
            </div>
            <CardTitle className="text-2xl font-semibold text-neutral-dark">
              Nijhuis Activity Manager
            </CardTitle>
            <p className="text-sm text-neutral-medium mt-2">
              Activiteiten Beheer Systeem
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">E-mailadres</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="uw.email@nijhuis.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Wachtwoord</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Voer uw wachtwoord in"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 font-medium"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Bezig met inloggen...
                  </div>
                ) : (
                  "Inloggen"
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-xs text-neutral-medium">
                Inloggegevens: b.weinreder@nijhuis.nl / admin123
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-xs text-neutral-medium">
            Problemen met inloggen? Neem contact op met de systeembeheerder.
          </p>
        </div>
      </div>
    </div>
  );
}
