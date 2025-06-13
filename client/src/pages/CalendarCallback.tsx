import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function CalendarCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      if (error) {
        toast({
          title: "Authentication Failed",
          description: error === 'access_denied' 
            ? "You cancelled the calendar connection" 
            : "Failed to authenticate with Microsoft",
          variant: "destructive",
        });
        setLocation('/calendar');
        return;
      }

      if (!code || state !== 'calendar_integration') {
        toast({
          title: "Invalid Response",
          description: "Invalid authentication response from Microsoft",
          variant: "destructive",
        });
        setLocation('/calendar');
        return;
      }

      try {
        // Exchange code for access token
        const response = await apiRequest("/api/calendar/oauth/callback", "POST", {
          code,
          redirectUri: `${window.location.origin}/calendar/callback`
        });

        toast({
          title: "Calendar Connected",
          description: "Your Outlook calendar has been successfully connected",
        });
        
        setLocation('/calendar');
      } catch (error: any) {
        console.error('Calendar callback error:', error);
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to connect your calendar",
          variant: "destructive",
        });
        setLocation('/calendar');
      }
    };

    handleCallback();
  }, [setLocation, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Connecting Your Calendar</h2>
            <p className="text-gray-600">
              Please wait while we securely connect your Microsoft Outlook calendar...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}