import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trophy, Search, Activity as ActivityIcon, AlertCircle } from "lucide-react";
import { QuickWin, Activity } from "@shared/schema";
import { format } from "date-fns";
import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";

export default function QuickWins() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: quickWins, isLoading: quickWinsLoading } = useQuery<QuickWin[]>({
    queryKey: ["/api/quickwins"],
  });

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
              Quick Wins Dashboard
            </h1>
            <p className="text-neutral-medium dark:text-gray-400 mt-1">
              View quick wins associated with your tasks. To add new quick wins, open a task and use the Quick Wins tab.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-medium h-4 w-4" />
          <Input
            placeholder="Search quick wins..."
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
                  Quick Wins are now Task-Specific
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Quick wins are now managed within individual tasks. This dashboard shows all quick wins across your tasks. 
                  To create new quick wins, go to Activities and open any task's detail view.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {quickWinsLoading ? (
          <div className="text-center py-12">
            <p className="text-neutral-medium">Loading quick wins...</p>
          </div>
        ) : filteredQuickWins.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-neutral-light mx-auto mb-4" />
            <p className="text-neutral-medium text-lg mb-2">
              {quickWins?.length === 0 ? "No quick wins yet" : "No quick wins match your search"}
            </p>
            <p className="text-neutral-medium">
              {quickWins?.length === 0 
                ? "Add quick wins by opening any task in the Activities section" 
                : "Try adjusting your search criteria"
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
      </div>
    </AppLayout>
  );
}