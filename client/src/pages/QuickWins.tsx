import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trophy, Search, Activity as ActivityIcon, AlertCircle, Target, Calendar, Users, AlertTriangle, ListChecks } from "lucide-react";
import { QuickWin, Activity } from "@shared/schema";
import { format } from "date-fns";
import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useTranslations } from "@/hooks/useTranslations";
import EditSubtaskModal from "@/components/modals/EditSubtaskModal";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import TaskCelebration from "@/components/celebrations/TaskCelebration";
import React from "react";

export default function QuickWins() {
  const { t } = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<any>(null);
  const [celebration, setCelebration] = useState<{
    isVisible: boolean;
    taskType: 'activity' | 'quickwin' | 'roadblock';
    taskTitle: string;
  }>({
    isVisible: false,
    taskType: 'quickwin',
    taskTitle: ''
  });
  const [filterStatus, setFilterStatus] = useState("all"); // Add filterStatus state

  const { data: quickWinsData, isLoading: quickWinsLoading, error: quickWinsError } = useQuery<QuickWin[]>({
    queryKey: ["/api/quickwins"],
    queryFn: async () => {
      const response = await fetch("/api/quickwins", { credentials: "include" });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Ensure we always get an array
      return Array.isArray(data) ? data : [];
    },
  });

  // Ensure quickWins is always an array
  const quickWins = Array.isArray(quickWinsData) ? quickWinsData : [];

  // Also fetch subtasks that are classified as quick wins
  const { data: subtasks = [], error: subtasksError } = useQuery<any[]>({
    queryKey: ["/api/subtasks"],
    queryFn: async () => {
      const response = await fetch("/api/subtasks", { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch subtasks");
      }
      return response.json();
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async (subtaskId: number) => {
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete subtask");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: t('common.success'),
        description: t('subtasks.deleteSuccess'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: t('subtasks.deleteFailed'),
        variant: "destructive",
      });
    },
  });

  const updateSubtaskStatusMutation = useMutation({
    mutationFn: async ({ subtaskId, status }: { subtaskId: number; status: string }) => {
      const response = await fetch(`/api/subtasks/${subtaskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update subtask status");
      }

      return response.json();
    },
    onSuccess: (_, { subtaskId, status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });

      // Show celebration for completed quick wins
      if (status === 'completed') {
        const subtask = subtasks.find(s => s.id === subtaskId);
        if (subtask) {
          setCelebration({
            isVisible: true,
            taskType: 'quickwin',
            taskTitle: subtask.title
          });
        }
      }

      toast({
        title: t('common.success'),
        description: "Quick Win status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: "Failed to update Quick Win status",
        variant: "destructive",
      });
    },
  });

  // Filter subtasks that are classified as quick wins by participants and exclude completed ones
  const quickWinSubtasks = (subtasks as any[]).filter((subtask: any) => {
    const participantTypes = subtask.participantTypes as Record<string, string> || {};
    const isQuickWin = subtask.type === "quick_win" || Object.values(participantTypes).includes("quick_win");
    const isNotCompleted = !subtask.completedDate;
    return isQuickWin && isNotCompleted;
  });

  // Filter quick win subtasks based on search query
  const filteredQuickWinSubtasks = quickWinSubtasks.filter((subtask: any) =>
    subtask.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subtask.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activityMap[subtask.linkedActivityId]?.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { data: activities = [], error: activitiesError } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
    queryFn: async () => {
      const response = await fetch("/api/activities", { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch activities");
      }
      return response.json();
    },
  });

  // Create a map of activity IDs to activity titles
  const activityMap = activities?.reduce((acc, activity) => {
    acc[activity.id] = activity;
    return acc;
  }, {} as Record<number, Activity>) || {};

  // Filter quick wins based on search query
  const searchTerm = searchQuery;

    // Ensure quickWins is always an array before filtering
  const safeQuickWins = Array.isArray(quickWins) ? quickWins : [];
  const activeQuickWins = safeQuickWins.filter((qw: any) => qw.status !== 'completed');
  const completedQuickWins = safeQuickWins.filter((qw: any) => qw.status === 'completed');

  // Ensure quickWins is always an array before filtering
  const quickWinsArray = Array.isArray(quickWins) ? quickWins : [];

  const filteredQuickWins = React.useMemo(() => {
    const validQuickWins = Array.isArray(quickWins) ? quickWins : [];
    return validQuickWins.filter(qw => {
      const matchesSearch = searchTerm === "" || 
        qw.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        qw.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === "all" || qw.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [quickWins, searchTerm, filterStatus]);

  // Group quick wins by status
  const quickWinsByStatus = {
    pending: filteredQuickWins.filter(qw => qw.status === "pending"),
    completed: filteredQuickWins.filter(qw => qw.status === "completed"),
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-dark dark:text-white flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              {t('quickWins.title')}
            </h1>
            <p className="text-neutral-medium dark:text-gray-400 mt-1">
              {t('quickWins.description')}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-medium h-4 w-4" />
          <Input
            placeholder={t('quickWins.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 micro-focus-ring"
          />
        </div>

        {quickWinsLoading ? (
          <div className="text-center py-12">
            <p className="text-neutral-medium">{t('common.loading')}</p>
          </div>
        ) : (quickWinsError || subtasksError || activitiesError) ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 text-lg mb-2">Error loading data</p>
            <p className="text-neutral-medium">
              {quickWinsError?.message || subtasksError?.message || activitiesError?.message || 'Unknown error occurred'}
            </p>
          </div>
        ) : filteredQuickWins.length === 0 && filteredQuickWinSubtasks.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-neutral-light mx-auto mb-4" />
            <p className="text-neutral-medium text-lg mb-2">
              {quickWins?.length === 0 && quickWinSubtasks.length === 0 ? t('quickWins.noQuickWins') : t('quickWins.noMatches')}
            </p>
            <p className="text-neutral-medium">
              {quickWins?.length === 0 && quickWinSubtasks.length === 0
                ? t('quickWins.addInstructions') 
                : t('quickWins.adjustSearch')
              }
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Traditional Quick Wins */}
            {filteredQuickWins.length > 0 && (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Pending Quick Wins */}
                <div>
                  <h2 className="text-lg font-semibold text-neutral-dark dark:text-white mb-4 flex items-center gap-2">
                    Pending ({quickWinsByStatus.pending.length})
                  </h2>
                  <div className="space-y-4">
                    {quickWinsByStatus.pending.map((quickWin) => {
                      const linkedActivity = activityMap[quickWin.linkedActivityId];
                      return (
                        <Card key={quickWin.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base text-neutral-dark dark:text-white">
                                  {quickWin.title}
                                </CardTitle>
                                {quickWin.description && (
                                  <p className="text-sm text-neutral-medium dark:text-gray-400 mt-1">
                                    {quickWin.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <Badge className={getImpactColor(quickWin.impact)}>
                                  Impact: {quickWin.impact}
                                </Badge>
                                <Badge className={getEffortColor(quickWin.effort)}>
                                  Effort: {quickWin.effort}
                                </Badge>
                              </div>

                              {linkedActivity && (
                                <div className="flex items-center gap-2 text-sm text-neutral-medium dark:text-gray-400">
                                  <ActivityIcon className="h-4 w-4" />
                                  <span>Task: {linkedActivity.title}</span>
                                </div>
                              )}

                              <div className="text-xs text-neutral-medium dark:text-gray-500">
                                Created: {format(new Date(quickWin.createdAt), "MMM dd, yyyy")}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {quickWinsByStatus.pending.length === 0 && (
                      <div className="text-center py-8 text-neutral-medium dark:text-gray-400">
                        Geen openstaande quick wins
                      </div>
                    )}
                  </div>
                </div>

                {/* Completed Quick Wins */}
                <div>
                  <h2 className="text-lg font-semibold text-neutral-dark dark:text-white mb-4 flex items-center gap-2">
                    Voltooid ({quickWinsByStatus.completed.length})
                  </h2>
                  <div className="space-y-4">
                    {quickWinsByStatus.completed.map((quickWin) => {
                      const linkedActivity = activityMap[quickWin.linkedActivityId];
                      return (
                        <Card key={quickWin.id} className="hover:shadow-md transition-shadow opacity-75">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base text-neutral-dark dark:text-white line-through">
                                  {quickWin.title}
                                </CardTitle>
                                {quickWin.description && (
                                  <p className="text-sm text-neutral-medium dark:text-gray-400 mt-1 line-through">
                                    {quickWin.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <Badge className={getImpactColor(quickWin.impact)}>
                                  Impact: {quickWin.impact}
                                </Badge>
                                <Badge className={getEffortColor(quickWin.effort)}>
                                  Effort: {quickWin.effort}
                                </Badge>
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  ✓ Completed
                                </Badge>
                              </div>

                              {linkedActivity && (
                                <div className="flex items-center gap-2 text-sm text-neutral-medium dark:text-gray-400">
                                  <ActivityIcon className="h-4 w-4" />
                                  <span>Task: {linkedActivity.title}</span>
                                </div>
                              )}

                              <div className="text-xs text-neutral-medium dark:text-gray-500">
                                Created: {format(new Date(quickWin.createdAt), "MMM dd, yyyy")}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {quickWinsByStatus.completed.length === 0 && (
                      <div className="text-center py-8 text-neutral-medium dark:text-gray-400">
                        Nog geen voltooide quick wins
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Subtasks Classified as Quick Wins */}
            {filteredQuickWinSubtasks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-neutral-dark dark:text-white mb-4 flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Actiepunten geclassificeerd als Quick Wins ({filteredQuickWinSubtasks.length})
                </h2>
                <div className="space-y-4">
                  {filteredQuickWinSubtasks.map((subtask: any) => {
                    const linkedActivity = activityMap[subtask.linkedActivityId];
                    const isOverdue = subtask.dueDate && new Date(subtask.dueDate) < new Date() && 
                                     subtask.status !== "completed" && subtask.status !== "resolved";

                    return (
                      <Card key={`subtask-${subtask.id}`} className={`transition-all hover:shadow-md ${isOverdue ? "ring-2 ring-red-200" : ""}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-sm font-medium mb-2">
                                {subtask.title}
                              </CardTitle>
                              <div className="flex gap-2 mb-2">
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  Quick Win
                                </Badge>
                                <Badge className={`${
                                  subtask.status === "completed" || subtask.status === "resolved" 
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : subtask.status === "in_progress" 
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                }`}>
                                  {subtask.status === "pending" ? "In wachtrij" :
                                   subtask.status === "in_progress" ? "In uitvoering" :
                                   subtask.status === "completed" ? "Voltooid" : "Opgelost"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {subtask.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {subtask.description}
                            </p>
                          )}

                          <div className="space-y-2 text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                              <ActivityIcon className="h-3 w-3" />
                              <span>Gekoppeld aan: {linkedActivity?.title || "Onbekende activiteit"}</span>
                            </div>

                            {subtask.dueDate && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                                  Vervaldatum: {format(new Date(subtask.dueDate), "dd/MM/yyyy")}
                                </span>
                                {isOverdue && <AlertTriangle className="h-3 w-3 text-red-600" />}
                              </div>
                            )}

                            {subtask.participants && subtask.participants.length > 0 && (
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3" />
                                <span>Deelnemers: {subtask.participants.length}</span>
                              </div>
                            )}
                          </div>

                          {/* Status and Actions */}
                          <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                            {subtask.status !== 'completed' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  updateSubtaskStatusMutation.mutate({
                                    subtaskId: subtask.id,
                                    status: 'completed'
                                  });
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                Mark Complete
                              </Button>
                            )}

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingSubtask(subtask);
                                  setIsEditModalOpen(true);
                                }}
                                className="flex items-center gap-2"
                              >
                                <Edit className="h-4 w-4" />
                                {t('common.edit')}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm(t('subtasks.deleteConfirm'))) {
                                    deleteSubtaskMutation.mutate(subtask.id);
                                  }
                                }}
                                className="flex items-center gap-2 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                                {t('common.delete')}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Subtask Modal */}
      <EditSubtaskModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        subtask={editingSubtask}
      />

      <TaskCelebration
        isVisible={celebration.isVisible}
        taskType={celebration.taskType}
        taskTitle={celebration.taskTitle}
        onComplete={() => setCelebration({ ...celebration, isVisible: false })}
      />
    </AppLayout>
  );
}