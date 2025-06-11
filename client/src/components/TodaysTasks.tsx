import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, Clock, Calendar, ArrowRight, Target, Zap, Construction, ArrowUpDown, AlertTriangle } from "lucide-react";
import { Activity, Subtask } from "@shared/schema";
import { TaskDetailModal } from "@/components/modals/TaskDetailModal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function TodaysTasks() {
  const [selectedTask, setSelectedTask] = useState<Activity | null>(null);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = new Date();
  const todayString = format(today, "yyyy-MM-dd");

  const { data: activities = [], isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const { data: subtasks = [], isLoading: subtasksLoading } = useQuery<Subtask[]>({
    queryKey: ["/api/subtasks"],
  });

  const { data: currentUser } = useQuery<{ user: any }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: taskCompletions = [] } = useQuery<Array<{activityId: number, completed: boolean}>>({
    queryKey: ["/api/daily-task-completions", todayString],
  });

  const toggleTaskCompletion = useMutation({
    mutationFn: async ({ activityId, completed }: { activityId: number; completed: boolean }) => {
      return apiRequest(`/api/daily-task-completions`, "POST", {
        activityId,
        taskDate: todayString,
        completed,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-task-completions", todayString] });
      toast({
        title: "Task updated",
        description: "Task completion status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task completion status",
        variant: "destructive",
      });
    },
  });

  // Get user's assigned subtasks from active activities
  const userEmail = currentUser?.user?.email;
  const assignedSubtasks = subtasks.filter(subtask => {
    if (!userEmail || !subtask.participants.includes(userEmail)) return false;
    
    // Find the linked activity
    const linkedActivity = activities.find(activity => activity.id === subtask.linkedActivityId);
    return linkedActivity && linkedActivity.status !== "completed";
  });

  // Eisenhower matrix prioritization for subtasks
  const prioritizeSubtasks = (subtasks: Subtask[]) => {
    const now = new Date();
    const urgentThreshold = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days

    return subtasks.sort((a, b) => {
      // Get participant task type preference
      const aParticipantTypes = a.participantTypes as Record<string, string> || {};
      const bParticipantTypes = b.participantTypes as Record<string, string> || {};
      const aTaskType = aParticipantTypes[userEmail || ''] || a.type;
      const bTaskType = bParticipantTypes[userEmail || ''] || b.type;

      // Priority scoring: quick_win = 3, task = 2, roadblock = 1
      const getTypeScore = (type: string) => {
        switch (type) {
          case "quick_win": return 3;
          case "task": return 2;
          case "roadblock": return 1;
          default: return 2;
        }
      };

      // Urgency scoring based on due date
      const getUrgencyScore = (subtask: Subtask) => {
        if (!subtask.dueDate) return 1;
        const dueDate = new Date(subtask.dueDate);
        if (dueDate <= urgentThreshold) return 3;
        return 1;
      };

      const aScore = getTypeScore(aTaskType) + getUrgencyScore(a);
      const bScore = getTypeScore(bTaskType) + getUrgencyScore(b);

      return bScore - aScore; // Higher score first
    });
  };

  // Filter overdue subtasks that will be converted to roadblocks
  const overdueSubtasks = subtasks.filter(subtask => {
    if (!subtask.dueDate || subtask.completedDate) return false;
    const dueDate = new Date(subtask.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(23, 59, 59, 999);
    return dueDate < today;
  });

  const hasOverdueWarning = overdueSubtasks.length > 0;

  // Filter activities for today (due today or in progress)
  const activitiesToday = activities.filter(activity => {
    const dueDate = activity.dueDate ? format(new Date(activity.dueDate), "yyyy-MM-dd") : null;
    return dueDate === todayString || activity.status === "in-progress";
  }).sort((a, b) => {
    // Eisenhower Matrix priority order
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const urgencyOrder = { urgent: 3, in_progress: 2, pending: 1, completed: 0 };
    
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
    const aUrgency = urgencyOrder[a.status as keyof typeof urgencyOrder] || 1;
    const bUrgency = urgencyOrder[b.status as keyof typeof urgencyOrder] || 1;
    
    // Primary sort: urgent + important (high priority + urgent status)
    const aScore = aPriority + aUrgency;
    const bScore = bPriority + bUrgency;
    
    return sortOrder === "desc" ? bScore - aScore : aScore - bScore;
  });

  // Combine prioritized subtasks and today's activities
  const prioritizedSubtasks = prioritizeSubtasks(assignedSubtasks);
  
  // Create combined list with proper sorting
  const combinedTasks = [
    ...activitiesToday.map(activity => ({ 
      ...activity, 
      isSubtask: false,
      taskType: 'activity',
      urgencyScore: getPriorityScore(activity.priority) + getStatusScore(activity.status)
    })),
    ...prioritizedSubtasks.slice(0, 5).map(subtask => {
      const linkedActivity = activities.find(activity => activity.id === subtask.linkedActivityId);
      const isUrgent = subtask.dueDate ? new Date(subtask.dueDate) <= new Date() : false;
      return {
        ...linkedActivity!,
        id: subtask.id,
        title: subtask.title,
        priority: subtask.priority,
        dueDate: subtask.dueDate,
        status: subtask.status,
        description: subtask.description,
        isSubtask: true,
        taskType: (subtask.participantTypes as Record<string, string>)?.[userEmail || ''] || subtask.type,
        urgencyScore: getPriorityScore(subtask.priority) + (isUrgent ? 3 : 0)
      };
    })
  ];

  // Sort combined list by urgency score with better priority handling
  const allTodaysTasks = combinedTasks
    .sort((a, b) => {
      // Primary sort by urgency score
      const scoreDiff = sortOrder === "desc" 
        ? b.urgencyScore - a.urgencyScore 
        : a.urgencyScore - b.urgencyScore;
      
      // Secondary sort by due date (earlier dates first for same score)
      if (scoreDiff === 0 && a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      
      // Tertiary sort by priority if scores and dates are same
      if (scoreDiff === 0) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPrio = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
        const bPrio = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
        return sortOrder === "desc" ? bPrio - aPrio : aPrio - bPrio;
      }
      
      return scoreDiff;
    })
    .slice(0, 8);

  // Helper functions for scoring
  function getPriorityScore(priority: string): number {
    const scores = { high: 3, medium: 2, low: 1 };
    return scores[priority as keyof typeof scores] || 1;
  }

  function getStatusScore(status: string): number {
    const scores = { urgent: 3, in_progress: 2, pending: 1, completed: 0 };
    return scores[status as keyof typeof scores] || 1;
  }

  // Create completion status map
  const completionMap = taskCompletions.reduce((acc, completion) => {
    acc[completion.activityId] = completion.completed;
    return acc;
  }, {} as Record<number, boolean>);

  if (activitiesLoading || subtasksLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Calendar className="mr-2 h-5 w-5" />
            Today's Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-lg">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-ms-blue flex-shrink-0" />
            <span>Today's Tasks</span>
            {hasOverdueWarning && (
              <Badge variant="destructive" className="text-xs">
                {overdueSubtasks.length} overdue
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              className="flex items-center gap-1 text-xs"
            >
              <ArrowUpDown className="h-3 w-3" />
              <span className="hidden sm:inline">
                {sortOrder === "desc" ? "High → Low" : "Low → High"}
              </span>
              <span className="sm:hidden">
                {sortOrder === "desc" ? "H→L" : "L→H"}
              </span>
            </Button>
            <Badge variant="secondary" className="text-xs">
              {allTodaysTasks.length} tasks
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overdue Warning */}
        {hasOverdueWarning && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-300">
                  {overdueSubtasks.length} Overdue Subtask{overdueSubtasks.length > 1 ? 's' : ''}
                </h4>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 leading-relaxed">
                  These will automatically convert to roadblocks at midnight if not completed.
                </p>
              </div>
            </div>
          </div>
        )}

        {allTodaysTasks.length === 0 ? (
          <div className="text-center py-8">
            <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-sm font-medium text-gray-900">No tasks for today</h3>
            <p className="mt-1 text-sm text-gray-500">
              Great! You're all caught up for today.
            </p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {allTodaysTasks.map((task: any) => {
              const isCompleted = completionMap[task.id] || false;
              return (
                <TaskCard
                  key={`${task.isSubtask ? 'subtask' : 'activity'}-${task.id}`}
                  task={task}
                  isCompleted={isCompleted}
                  onToggleCompletion={(checked: boolean) => {
                    toggleTaskCompletion.mutate({
                      activityId: task.id,
                      completed: checked,
                    });
                  }}
                  onTaskClick={() => {
                    if (!task.isSubtask) {
                      setSelectedTask(task);
                      setIsTaskDetailModalOpen(true);
                    }
                  }}
                  onNavigate={() => {
                    window.location.href = task.isSubtask ? `/subtasks` : `/activities`;
                  }}
                />
              );
            })}
            
            {allTodaysTasks.length > 0 && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-sm"
                  onClick={() => window.location.href = '/activities'}
                >
                  <span>View All Activities</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {selectedTask && (
        <TaskDetailModal
          activity={selectedTask}
          isOpen={isTaskDetailModalOpen}
          onClose={() => setIsTaskDetailModalOpen(false)}
        />
      )}
    </Card>
  );
}