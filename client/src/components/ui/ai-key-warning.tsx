import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface KeyStatus {
  usingBackupKey: boolean;
  hasBackupKey: boolean;
  hasPrimaryKey: boolean;
}

export function AIKeyWarning() {
  const { data: keyStatus } = useQuery<KeyStatus>({
    queryKey: ["/api/ai-key-status"],
    refetchInterval: 30000, // Check every 30 seconds
    retry: false
  });

  if (!keyStatus?.usingBackupKey) {
    return null;
  }

  return (
    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20 mb-4">
      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertDescription className="text-orange-800 dark:text-orange-200">
        <strong>Using Backup OpenAI Key:</strong> The primary API key has reached its quota limit. 
        AI features are running on the backup key. Consider monitoring your API usage.
      </AlertDescription>
    </Alert>
  );
}