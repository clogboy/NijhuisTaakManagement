import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface RescueWorkflowData {
  title: string;
  description: string;
  oorzaakCategory: string;
  oorzaakFactor?: string;
  resolution: string;
  newDeadline: string;
  linkedActivityId: number;
  departmentImpact: string[];
}

interface RescueWorkflowResult {
  roadblock: any;
  rescueSubtask: any;
}

export const useRescueWorkflow = () => {
  const [isRescueMode, setIsRescueMode] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const rescueMutation = useMutation<RescueWorkflowResult, Error, RescueWorkflowData>({
    mutationFn: async (data) => {
      const response = await apiRequest("POST", "/api/roadblocks", {
        ...data,
        isRescueMode: true,
        linkedTaskId: selectedTask?.id,
        severity: "medium",
        assignedTo: "",
        reportedDate: new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: (result) => {
      // Invalidate relevant queries efficiently
      const queryKeys = [
        ["/api/roadblocks"],
        ["/api/subtasks"],
        ["/api/stats"],
        ["/api/activities"]
      ];
      
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      
      // Force immediate refetch of stats to update dashboard metrics
      queryClient.refetchQueries({ queryKey: ["/api/stats"] });

      toast({
        title: "Rescue Succesvol",
        description: "Wegversperring aangemaakt en nieuwe taak ingepland",
      });

      // Reset state
      setIsRescueMode(false);
      setSelectedTask(null);
    },
    onError: (error) => {
      toast({
        title: "Rescue Failed",
        description: error.message || "Failed to rescue task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startRescue = useCallback((task: any) => {
    setSelectedTask(task);
    setIsRescueMode(true);
  }, []);

  const cancelRescue = useCallback(() => {
    setIsRescueMode(false);
    setSelectedTask(null);
  }, []);

  const executeRescue = useCallback((data: Omit<RescueWorkflowData, 'linkedActivityId'>) => {
    if (!selectedTask) {
      toast({
        title: "Error",
        description: "No task selected for rescue",
        variant: "destructive",
      });
      return;
    }

    rescueMutation.mutate({
      ...data,
      linkedActivityId: selectedTask.linkedActivityId,
    });
  }, [selectedTask, rescueMutation, toast]);

  return {
    isRescueMode,
    selectedTask,
    startRescue,
    cancelRescue,
    executeRescue,
    isExecuting: rescueMutation.isPending,
    error: rescueMutation.error,
  };
};