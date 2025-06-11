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

export default function QuickWins() {
  const { t } = useTranslations();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: quickWins, isLoading: quickWinsLoading } = useQuery<QuickWin[]>({
    queryKey: ["/api/quickwins"],
    queryFn: () => fetch("/api/quickwins", { credentials: "include" }).then(res => res.json()),
  });

  // Also fetch subtasks that are classified as quick wins
  const { data: subtasks = [] } = useQuery<any[]>({
    queryKey: ["/api/subtasks"],
  });

  // Filter subtasks that are classified as quick wins by participants
  const quickWinSubtasks = (subtasks as any[]).filter((subtask: any) => {
    const participantTypes = subtask.participantTypes as Record<string, string> || {};
    return subtask.type === "quick_win" || Object.values(participantTypes).includes("quick_win");
  });

  // Filter quick win subtasks based on search query
  const filteredQuickWinSubtasks = quickWinSubtasks.filter((subtask: any) =>
    subtask.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subtask.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activityMap[subtask.linkedActivityId]?.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { data: activities } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  // Create a map of activity IDs to activity titles
  const activityMap = activities?.reduce((acc, activity) => {
    acc[activity.id] = activity;
    return acc;
  }, {} as Record<number, Activity>) || {};

  // Filter quick wins based on search query
  const filteredQuickWins = quickWins?.filter(quickWin =>
    quickWin.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quickWin.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activityMap[quickWin.linkedActivityId]?.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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

        {/* Info Banner */}
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
{t('quickWins.taskSpecific')}
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
{t('quickWins.taskSpecificDescription')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {quickWinsLoading ? (
          <div className="text-center py-12">
            <p className="text-neutral-medium">{t('common.loading')}</p>
          </div>
        ) : filteredQuickWins.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-neutral-light mx-auto mb-4" />
            <p className="text-neutral-medium text-lg mb-2">
{quickWins?.length === 0 ? t('quickWins.noQuickWins') : t('quickWins.noMatches')}
            </p>
            <p className="text-neutral-medium">
{quickWins?.length === 0 
                ? t('quickWins.addInstructions') 
                : t('quickWins.adjustSearch')
              }
            </p>
          </div>
        ) : (
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
                    <Card key={quickWin.id} className="micro-card micro-fadeIn">
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
                    No pending quick wins
                  </div>
                )}
              </div>
            </div>

            {/* Completed Quick Wins */}
            <div>
              <h2 className="text-lg font-semibold text-neutral-dark dark:text-white mb-4 flex items-center gap-2">
                Completed ({quickWinsByStatus.completed.length})
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
                    No completed quick wins yet
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Subtasks Classified as Quick Wins */}
        {filteredQuickWinSubtasks.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-neutral-dark dark:text-white mb-4 flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Subtaken geclassificeerd als Quick Wins ({filteredQuickWinSubtasks.length})
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}