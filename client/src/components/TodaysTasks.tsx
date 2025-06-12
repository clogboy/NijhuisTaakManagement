import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, Clock, Calendar, ArrowRight, Target, Zap, Construction, ArrowUpDown, AlertTriangle, Play, Pause, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Subtask } from "@shared/schema";
import { TaskDetailModal } from "@/components/modals/TaskDetailModal";
import { TaskProgress } from "@/components/TaskProgress";
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
    queryKey: ["/api/daily-task-completions"],
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
      queryClient.invalidateQueries({ queryKey: ["/api/daily-task-completions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subtasks"] });
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

  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status, isSubtask }: { taskId: number; status: string; isSubtask: boolean }) => {
      const endpoint = isSubtask ? `/api/subtasks/${taskId}/status` : `/api/activities/${taskId}/status`;
      return apiRequest(endpoint, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subtasks"] });
      toast({
        title: "Status updated",
        description: "Task status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    },
  });

  // Create completion status map first
  const completionMap = taskCompletions.reduce((acc, completion: any) => {
    acc[completion.activityId] = completion.completed;
    return acc;
  }, {} as Record<number, boolean>);

  // Get user's assigned subtasks from active activities and exclude completed
  const userEmail = currentUser?.user?.email;
  const assignedSubtasks = subtasks.filter(subtask => {
    if (!userEmail || !subtask.participants.includes(userEmail)) return false;
    if (subtask.status === "completed" || subtask.status === "resolved") return false;
    
    // Also check if it's marked as completed in daily completions
    const isCompletedDaily = completionMap[subtask.id];
    if (isCompletedDaily) return false;
    
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

  // Filter activities for today (due today or in progress) and exclude completed
  const activitiesToday = activities.filter(activity => {
    if (activity.status === "completed") return false;
    const dueDate = activity.dueDate ? format(new Date(activity.dueDate), "yyyy-MM-dd") : null;
    return dueDate === todayString || activity.status === "in_progress";
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
  
  // Only show subtasks (tasks) - exclude activities from Today's Tasks
  const todaysTasks = prioritizedSubtasks.slice(0, 10).map(subtask => {
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
      urgencyScore: getPriorityScore(subtask.priority) + (isUrgent ? 3 : 0),
      parentActivityTitle: linkedActivity?.title || 'Onbekende activiteit'
    };
  });

  // Sort tasks by urgency score with better priority handling
  const allTodaysTasks = todaysTasks
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



  if (activitiesLoading || subtasksLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Calendar className="mr-2 h-5 w-5" />
            Mijn acties
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
            <span>Mijn acties</span>
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
          <div className="space-y-3">
            {allTodaysTasks.map((task: any) => {
              const isCompleted = completionMap[task.id] || false;
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed";
              
              const getTypeColor = (type: string) => {
                switch (type) {
                  case 'quick_win': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
                  case 'roadblock': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
                  default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
                }
              };

              const getStatusColor = (status: string) => {
                switch (status) {
                  case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
                  case 'in_progress': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
                  case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
                  default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
                }
              };

              const getPriorityColor = (priority: string) => {
                switch (priority) {
                  case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
                  case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
                  case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
                  default: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
                }
              };
              
              return (
                <Card 
                  key={`${task.isSubtask ? 'subtask' : 'activity'}-${task.id}`}
                  className={`transition-all hover:shadow-md ${isOverdue ? "ring-2 ring-red-200" : ""}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Checkbox
                            checked={isCompleted}
                            onCheckedChange={(checked) => {
                              toggleTaskCompletion.mutate({
                                activityId: task.id,
                                completed: !!checked,
                              });
                              
                              if (checked) {
                                updateTaskStatus.mutate({
                                  taskId: task.id,
                                  status: 'completed',
                                  isSubtask: task.isSubtask
                                });
                              }
                            }}
                            className="flex-shrink-0"
                          />
                          <div className="flex-1">
                            <span className={isCompleted ? "line-through text-gray-500" : ""}>
                              {task.title}
                            </span>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              van: {task.parentActivityTitle}
                            </div>
                          </div>
                        </CardTitle>
                        <div className="flex gap-2 mb-2">
                          <Badge className={getTypeColor(task.taskType || 'task')}>
                            {task.taskType === "quick_win" ? "Quick Win" : 
                             task.taskType === "roadblock" ? "Roadblock" : "Task"}
                          </Badge>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status === "pending" ? "Pending" :
                             task.status === "in_progress" ? "In Progress" :
                             task.status === "completed" ? "Completed" : "Resolved"}
                          </Badge>
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority === "urgent" ? "Urgent" :
                             task.priority === "high" ? "High" :
                             task.priority === "medium" ? "Medium" : "Low"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {task.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="space-y-2 text-xs text-gray-500">
                      {task.dueDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                            Due: {format(new Date(task.dueDate), "dd/MM/yyyy")}
                          </span>
                          {isOverdue && <AlertTriangle className="h-3 w-3 text-red-600" />}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Select
                            value={task.status}
                            onValueChange={(status) => {
                              updateTaskStatus.mutate({
                                taskId: task.id,
                                status,
                                isSubtask: task.isSubtask
                              });
                            }}
                          >
                            <SelectTrigger className="w-32 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {task.isSubtask ? (
                                <>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                </>
                              ) : (
                                <>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {!task.isSubtask && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTask(task);
                              setIsTaskDetailModalOpen(true);
                            }}
                            className="h-7 px-3 text-xs"
                          >
                            View Details
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
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