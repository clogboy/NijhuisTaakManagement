import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Database, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  RefreshCw,
  Clock,
  Wifi,
  WifiOff
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SupabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: {
    connected: boolean;
    error?: {
      message: string;
      code?: string;
      details?: string;
    };
    latency?: number;
    timestamp: string;
  };
  suggestions?: string[];
}

export default function SupabaseStatus() {
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const { data: healthData, isLoading, refetch } = useQuery<SupabaseHealth>({
    queryKey: ["/api/supabase/health"],
    refetchInterval: 30000, // Check every 30 seconds
  });

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      await apiRequest("/api/supabase/test-connection", "POST");
      queryClient.invalidateQueries({ queryKey: ["/api/supabase/health"] });
    } catch (error) {
      console.error("Connection test failed:", error);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Database className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatLatency = (latency?: number) => {
    if (!latency) return 'N/A';
    if (latency < 100) return `${latency}ms (Excellent)`;
    if (latency < 300) return `${latency}ms (Good)`;
    if (latency < 1000) return `${latency}ms (Fair)`;
    return `${latency}ms (Slow)`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Supabase Database Status
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={isTestingConnection}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isTestingConnection ? 'animate-spin' : ''}`} />
              Test Connection
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Checking database status...
          </div>
        ) : healthData ? (
          <>
            {/* Connection Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {healthData.details.connected ? (
                  <Wifi className="h-4 w-4 text-green-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">
                  {healthData.details.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <Badge className={getStatusColor(healthData.status)}>
                {getStatusIcon(healthData.status)}
                <span className="ml-1 capitalize">{healthData.status}</span>
              </Badge>
            </div>

            {/* Performance Metrics */}
            {healthData.details.connected && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-2 border rounded">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-xs text-gray-500">Response Time</div>
                    <div className="font-medium">{formatLatency(healthData.details.latency)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 border rounded">
                  <Database className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-xs text-gray-500">Last Check</div>
                    <div className="font-medium">
                      {new Date(healthData.details.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Information */}
            {healthData.details.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">Connection Error</div>
                  <div className="text-sm">{healthData.details.error.message}</div>
                  {healthData.details.error.details && (
                    <div className="text-xs mt-1 opacity-75">
                      {healthData.details.error.details}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Suggestions */}
            {healthData.suggestions && healthData.suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="font-medium text-sm">Recommendations:</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  {healthData.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-blue-600 mt-1">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Connection Details */}
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                Technical Details
              </summary>
              <div className="mt-2 p-2 bg-gray-50 rounded font-mono text-xs">
                <div>Status: {healthData.status}</div>
                <div>Connected: {healthData.details.connected.toString()}</div>
                <div>Latency: {healthData.details.latency}ms</div>
                <div>Timestamp: {healthData.details.timestamp}</div>
                {healthData.details.error?.code && (
                  <div>Error Code: {healthData.details.error.code}</div>
                )}
              </div>
            </details>
          </>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to retrieve database status. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}