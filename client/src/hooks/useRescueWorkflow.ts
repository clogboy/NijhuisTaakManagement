
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/auth';
import { useToast } from './use-toast';

interface RescueStep {
  id: string;
  title: string;
  description: string;
  action?: string;
  completed: boolean;
}

interface RescueWorkflow {
  roadblockId: number;
  currentStep: number;
  steps: RescueStep[];
  status: 'not_started' | 'in_progress' | 'completed' | 'escalated';
}

const DEFAULT_RESCUE_STEPS: Omit<RescueStep, 'completed'>[] = [
  {
    id: 'identify',
    title: 'Identify Root Cause',
    description: 'Break down the roadblock into specific, actionable components',
    action: 'List the exact blockers preventing progress'
  },
  {
    id: 'resources',
    title: 'Gather Resources',
    description: 'Identify what information, tools, or people you need',
    action: 'Document required resources and how to access them'
  },
  {
    id: 'alternatives',
    title: 'Find Alternatives',
    description: 'Brainstorm workarounds or alternative approaches',
    action: 'List at least 2-3 different ways to move forward'
  },
  {
    id: 'action',
    title: 'Take Action',
    description: 'Execute the chosen solution or workaround',
    action: 'Implement the most feasible alternative'
  },
  {
    id: 'validate',
    title: 'Validate Solution',
    description: 'Confirm the roadblock is resolved or progress is made',
    action: 'Test the solution and document results'
  }
];

export function useRescueWorkflow() {
  const [activeWorkflow, setActiveWorkflow] = useState<RescueWorkflow | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const startRescue = useMutation({
    mutationFn: async (roadblockId: number) => {
      const response = await apiRequest('POST', '/api/rescue-workflow', {
        roadblockId,
        steps: DEFAULT_RESCUE_STEPS.map(step => ({ ...step, completed: false }))
      });
      return response.json();
    },
    onSuccess: (workflow) => {
      setActiveWorkflow(workflow);
      toast({ 
        title: "Rescue workflow started", 
        description: "Follow the steps to systematically resolve this roadblock" 
      });
    }
  });

  const completeStep = useMutation({
    mutationFn: async ({ workflowId, stepId, notes }: { 
      workflowId: number; 
      stepId: string; 
      notes?: string; 
    }) => {
      const response = await apiRequest('PATCH', `/api/rescue-workflow/${workflowId}/step`, {
        stepId,
        completed: true,
        notes
      });
      return response.json();
    },
    onSuccess: (updatedWorkflow) => {
      setActiveWorkflow(updatedWorkflow);
      const completedSteps = updatedWorkflow.steps.filter((s: RescueStep) => s.completed).length;
      const totalSteps = updatedWorkflow.steps.length;
      
      if (completedSteps === totalSteps) {
        toast({ 
          title: "Rescue workflow completed! 🎉", 
          description: "Great job resolving this roadblock systematically" 
        });
        queryClient.invalidateQueries({ queryKey: ["/api/roadblocks"] });
      } else {
        toast({ title: `Step completed (${completedSteps}/${totalSteps})` });
      }
    }
  });

  const escalateWorkflow = useMutation({
    mutationFn: async (workflowId: number) => {
      const response = await apiRequest('PATCH', `/api/rescue-workflow/${workflowId}/escalate`, {
        status: 'escalated'
      });
      return response.json();
    },
    onSuccess: () => {
      setActiveWorkflow(null);
      toast({ 
        title: "Roadblock escalated", 
        description: "This will be reviewed for additional support" 
      });
    }
  });

  const getCurrentStep = () => {
    if (!activeWorkflow) return null;
    return activeWorkflow.steps.find(step => !step.completed) || null;
  };

  const getProgress = () => {
    if (!activeWorkflow) return 0;
    const completed = activeWorkflow.steps.filter(step => step.completed).length;
    return (completed / activeWorkflow.steps.length) * 100;
  };

  return {
    activeWorkflow,
    startRescue,
    completeStep,
    escalateWorkflow,
    getCurrentStep,
    getProgress,
    setActiveWorkflow
  };
}
