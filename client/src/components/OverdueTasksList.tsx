import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Activity } from "lucide-react";
import { format } from "date-fns";

export default function OverdueTasksList() {
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
            </div>
          );
        })}
        
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 p-2 rounded">
          Deze taken worden automatisch omgezet naar knelpunten om middernacht als ze niet voltooid worden.
        </div>
      </CardContent>
    </Card>
  );
}