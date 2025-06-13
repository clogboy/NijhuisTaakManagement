import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Search, Activity as ActivityIcon, AlertCircle, User, ListChecks, Clock } from "lucide-react";
import { Roadblock, Activity } from "@shared/schema";
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

export default function Roadblocks() {
  const { t } = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<any>(null);

  const { data: roadblocks, isLoading: roadblocksLoading } = useQuery<Roadblock[]>({
    queryKey: ["/api/roadblocks"],
  });

  // Also fetch subtasks that are classified as roadblocks
  const { data: subtasks = [] } = useQuery<any[]>({
    queryKey: ["/api/subtasks"],
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

  // Filter subtasks that are classified as roadblocks by participants
  const roadblockSubtasks = (subtasks as any[]).filter((subtask: any) => {
    const participantTypes = subtask.participantTypes as Record<string, string> || {};
    return subtask.type === "roadblock" || Object.values(participantTypes).includes("roadblock");
  });

  // Filter roadblock subtasks based on search query
  const filteredRoadblockSubtasks = roadblockSubtasks.filter((subtask: any) =>
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

  // Filter roadblocks based on search query
  const filteredRoadblocks = roadblocks?.filter(roadblock =>
    roadblock.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    roadblock.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    roadblock.assignedTo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activityMap[roadblock.linkedActivityId]?.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Group roadblocks by status
  const roadblocksByStatus = {
    open: filteredRoadblocks.filter(rb => rb.status === "open"),
    in_progress: filteredRoadblocks.filter(rb => rb.status === "in_progress"),
    resolved: filteredRoadblocks.filter(rb => rb.status === "resolved"),
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "in_progress": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "resolved": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return "🚨";
      case "high": return "⚠️";
      case "medium": return "🟡";
      case "low": return "🟢";
      default: return "⚪";
    }
  };

  return (
    <AppLayout>
      <div className="p-3 sm:p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-dark dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              {t('roadblocks.title')}
            </h1>
            <p className="text-neutral-medium dark:text-gray-400 mt-1">
              {t('roadblocks.description')}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-medium h-4 w-4" />
          <Input
            placeholder={t('roadblocks.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 micro-focus-ring"
          />
        </div>

        {roadblocksLoading ? (
          <div className="text-center py-12">
            <p className="text-neutral-medium">Loading roadblocks...</p>
          </div>
        ) : filteredRoadblocks.length === 0 && filteredRoadblockSubtasks.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-neutral-light mx-auto mb-4" />
            <p className="text-neutral-medium text-lg mb-2">
              {roadblocks?.length === 0 && roadblockSubtasks.length === 0 ? "No roadblocks reported" : "No roadblocks match your search"}
            </p>
            <p className="text-neutral-medium">
              {roadblocks?.length === 0 && roadblockSubtasks.length === 0
                ? "Report roadblocks by opening any task in the Activities section" 
                : "Try adjusting your search criteria"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Traditional Roadblocks */}
            {filteredRoadblocks.length > 0 && (
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Open Roadblocks */}
                <div>
                  <h2 className="text-lg font-semibold text-neutral-dark dark:text-white mb-4 flex items-center gap-2">
                    <span className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded text-sm">
                      Open ({roadblocksByStatus.open.length})
                    </span>
                  </h2>
                  <div className="space-y-4">
                    {roadblocksByStatus.open.map((roadblock) => {
                      const linkedActivity = activityMap[roadblock.linkedActivityId];
                      return (
                        <Card key={roadblock.id} className="hover:shadow-md transition-shadow border-l-4 border-l-red-500">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base text-neutral-dark dark:text-white flex items-center gap-2">
                                  <span>{getSeverityIcon(roadblock.severity)}</span>
                                  {roadblock.title}
                                </CardTitle>
                                <p className="text-sm text-neutral-medium dark:text-gray-400 mt-1">
                                  {roadblock.description}
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div className="flex gap-2 flex-wrap">
                                <Badge className={getSeverityColor(roadblock.severity)}>
                                  {roadblock.severity} severity
                                </Badge>
                                <Badge className={getStatusColor(roadblock.status)}>
                                  {roadblock.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              
                              {roadblock.assignedTo && (
                                <div className="flex items-center gap-2 text-sm text-neutral-medium dark:text-gray-400">
                                  <User className="h-4 w-4" />
                                  <span>Assigned to: {roadblock.assignedTo}</span>
                                </div>
                              )}
                              
                              {linkedActivity && (
                                <div className="flex items-center gap-2 text-sm text-neutral-medium dark:text-gray-400">
                                  <ActivityIcon className="h-4 w-4" />
                                  <span>Task: {linkedActivity.title}</span>
                                </div>
                              )}
                              
                              <div className="text-xs text-neutral-medium dark:text-gray-500">
                                Reported: {format(new Date(roadblock.reportedDate), "MMM dd, yyyy")}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    
                    {roadblocksByStatus.open.length === 0 && (
                      <div className="text-center py-8 text-neutral-medium dark:text-gray-400">
                        No open roadblocks
                      </div>
                    )}
                  </div>
                </div>

                {/* In Progress Roadblocks */}
                <div>
                  <h2 className="text-lg font-semibold text-neutral-dark dark:text-white mb-4 flex items-center gap-2">
                    <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 rounded text-sm">
                      In Progress ({roadblocksByStatus.in_progress.length})
                    </span>
                  </h2>
                  <div className="space-y-4">
                    {roadblocksByStatus.in_progress.map((roadblock) => {
                      const linkedActivity = activityMap[roadblock.linkedActivityId];
                      return (
                        <Card key={roadblock.id} className="hover:shadow-md transition-shadow border-l-4 border-l-yellow-500">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base text-neutral-dark dark:text-white flex items-center gap-2">
                                  <span>{getSeverityIcon(roadblock.severity)}</span>
                                  {roadblock.title}
                                </CardTitle>
                                <p className="text-sm text-neutral-medium dark:text-gray-400 mt-1">
                                  {roadblock.description}
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div className="flex gap-2 flex-wrap">
                                <Badge className={getSeverityColor(roadblock.severity)}>
                                  {roadblock.severity} severity
                                </Badge>
                                <Badge className={getStatusColor(roadblock.status)}>
                                  {roadblock.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              
                              {roadblock.assignedTo && (
                                <div className="flex items-center gap-2 text-sm text-neutral-medium dark:text-gray-400">
                                  <User className="h-4 w-4" />
                                  <span>Assigned to: {roadblock.assignedTo}</span>
                                </div>
                              )}
                              
                              {linkedActivity && (
                                <div className="flex items-center gap-2 text-sm text-neutral-medium dark:text-gray-400">
                                  <ActivityIcon className="h-4 w-4" />
                                  <span>Task: {linkedActivity.title}</span>
                                </div>
                              )}
                              
                              <div className="text-xs text-neutral-medium dark:text-gray-500">
                                Reported: {format(new Date(roadblock.reportedDate), "MMM dd, yyyy")}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    
                    {roadblocksByStatus.in_progress.length === 0 && (
                      <div className="text-center py-8 text-neutral-medium dark:text-gray-400">
                        Geen wegversperringen in behandeling
                      </div>
                    )}
                  </div>
                </div>

                {/* Resolved Roadblocks */}
                <div>
                  <h2 className="text-lg font-semibold text-neutral-dark dark:text-white mb-4 flex items-center gap-2">
                    <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded text-sm">
                      Opgelost ({roadblocksByStatus.resolved.length})
                    </span>
                  </h2>
                  <div className="space-y-4">
                    {roadblocksByStatus.resolved.map((roadblock) => {
                      const linkedActivity = activityMap[roadblock.linkedActivityId];
                      return (
                        <Card key={roadblock.id} className="hover:shadow-md transition-shadow opacity-75 border-l-4 border-l-green-500">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base text-neutral-dark dark:text-white line-through flex items-center gap-2">
                                  <span>{getSeverityIcon(roadblock.severity)}</span>
                                  {roadblock.title}
                                </CardTitle>
                                <p className="text-sm text-neutral-medium dark:text-gray-400 mt-1 line-through">
                                  {roadblock.description}
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div className="flex gap-2 flex-wrap">
                                <Badge className={getSeverityColor(roadblock.severity)}>
                                  {roadblock.severity} severity
                                </Badge>
                                <Badge className={getStatusColor(roadblock.status)}>
                                  ✓ Resolved
                                </Badge>
                              </div>
                              
                              {roadblock.assignedTo && (
                                <div className="flex items-center gap-2 text-sm text-neutral-medium dark:text-gray-400">
                                  <User className="h-4 w-4" />
                                  <span>Assigned to: {roadblock.assignedTo}</span>
                                </div>
                              )}
                              
                              {linkedActivity && (
                                <div className="flex items-center gap-2 text-sm text-neutral-medium dark:text-gray-400">
                                  <ActivityIcon className="h-4 w-4" />
                                  <span>Task: {linkedActivity.title}</span>
                                </div>
                              )}
                              
                              <div className="text-xs text-neutral-medium dark:text-gray-500">
                                Reported: {format(new Date(roadblock.reportedDate), "MMM dd, yyyy")}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    
                    {roadblocksByStatus.resolved.length === 0 && (
                      <div className="text-center py-8 text-neutral-medium dark:text-gray-400">
                        No resolved roadblocks yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Subtasks Classified as Roadblocks */}
            {filteredRoadblockSubtasks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-neutral-dark dark:text-white mb-4 flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Subtaken geclassificeerd als Wegversperringen ({filteredRoadblockSubtasks.length})
                </h2>
                <div className="space-y-4">
                  {filteredRoadblockSubtasks.map((subtask: any) => {
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
                                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                  Wegversperring
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
                                <Clock className="h-3 w-3" />
                                <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                                  Vervaldatum: {format(new Date(subtask.dueDate), "dd/MM/yyyy")}
                                </span>
                                {isOverdue && <AlertTriangle className="h-3 w-3 text-red-600" />}
                              </div>
                            )}
                            
                            {subtask.participants && subtask.participants.length > 0 && (
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                <span>Deelnemers: {subtask.participants.length}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Edit and Delete Actions */}
                          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
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
    </AppLayout>
  );
}