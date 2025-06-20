import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, Activity, Wrench } from "lucide-react";
import { format } from "date-fns";
import StreamlinedRoadblockForm from "@/components/roadblocks/StreamlinedRoadblockForm";
import { useRescueWorkflow } from "@/hooks/useRescueWorkflow";

interface OverdueTasksListProps {
  autoShowRescue?: boolean;
}

export default function OverdueTasksList({ autoShowRescue = false }: OverdueTasksListProps) {
  const [showRescuePanel, setShowRescuePanel] = useState(autoShowRescue);
  const [selectedTaskForRescue, setSelectedTaskForRescue] = useState<any>(null);
  const { executeRescue, isExecuting } = useRescueWorkflow();

  const { data: subtasks = [] } = useQuery<any[]>({
    queryKey: ["/api/subtasks"],
  });

  const { data: activities = [] } = useQuery<any[]>({
    queryKey: ["/api/activities"],
  });

  // Filter for overdue tasks
  const overdueTasks = subtasks.filter(subtask => {
    if (!subtask.dueDate || subtask.completedDate || subtask.status === 'completed' || subtask.status === 'resolved') {
      return false;
    }
    
    const dueDate = new Date(subtask.dueDate);
    const today = new Date();
    
    // Set both to start of day for accurate comparison
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    return dueDate < today;
  });

  if (overdueTasks.length === 0) {
    return null;
  }

  const getLinkedActivity = (activityId: number) => {
    return activities.find(a => a.id === activityId);
  };

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    
    // Set both dates to start of day for accurate comparison
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
          <AlertTriangle className="h-5 w-5" />
          Verlopen taken ({overdueTasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {overdueTasks.map(task => {
          const linkedActivity = getLinkedActivity(task.linkedActivityId);
          const daysOverdue = getDaysOverdue(task.dueDate);
          
          return (
            <div key={task.id} className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-red-200 dark:border-red-800">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">{task.title}</h4>
                <Badge variant="destructive" className="text-xs">
                  {daysOverdue} dag{daysOverdue > 1 ? 'en' : ''} verlopen
                </Badge>
              </div>
              
              {task.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{task.description}</p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Vervaldatum: {format(new Date(task.dueDate), "dd/MM/yyyy")}</span>
                  </div>
                  
                  {linkedActivity && (
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      <span>{linkedActivity.title}</span>
                    </div>
                  )}
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setSelectedTaskForRescue(task);
                    setShowRescuePanel(true);
                  }}
                >
                  <Wrench className="h-3 w-3 mr-1" />
                  Rescue
                </Button>
              </div>
            </div>
          );
        })}
        
        {!showRescuePanel && (
          <div className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 p-2 rounded">
            Deze taken worden automatisch omgezet naar wegversperringen om middernacht als ze niet voltooid worden.
          </div>
        )}

        {showRescuePanel && (
          <div className="mt-4 p-4 border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-orange-800 dark:text-orange-200 flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Task Rescue Panel
                {selectedTaskForRescue && (
                  <span className="text-sm font-normal">- {selectedTaskForRescue.title}</span>
                )}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowRescuePanel(false);
                  setSelectedTaskForRescue(null);
                }}
              >
                ×
              </Button>
            </div>
            
            <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
              Identify the root cause (oorzaak) to convert this overdue task into a high-priority subtask with a new deadline.
            </p>
            
            {selectedTaskForRescue && (
              <StreamlinedRoadblockForm
                taskData={{
                  id: selectedTaskForRescue.id,
                  title: selectedTaskForRescue.title,
                  description: selectedTaskForRescue.description,
                  linkedActivityId: selectedTaskForRescue.linkedActivityId,
                  dueDate: selectedTaskForRescue.dueDate,
                  priority: selectedTaskForRescue.priority,
                }}
                onSubmit={(data) => {
                  executeRescue(data);
                  setShowRescuePanel(false);
                  setSelectedTaskForRescue(null);
                }}
                isLoading={isExecuting}
                onCancel={() => {
                  setShowRescuePanel(false);
                  setSelectedTaskForRescue(null);
                }}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}