import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Edit, Eye } from "lucide-react";
import { Activity, ActivityLog } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/hooks/useTranslations";
import { format } from "date-fns";
import NewActivityModal from "@/components/modals/NewActivityModal";
import EditActivityModal from "@/components/modals/EditActivityModal";
import { TaskDetailModal } from "@/components/modals/TaskDetailModal";

export default function Activities() {
  const { t } = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isNewActivityModalOpen, setIsNewActivityModalOpen] = useState(false);
  const [isEditActivityModalOpen, setIsEditActivityModalOpen] = useState(false);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [logEntry, setLogEntry] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const { data: activityLogs } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activities", selectedActivity?.id, "logs"],
    enabled: !!selectedActivity,
  });

  const deleteActivityMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/activities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Success",
        description: "Activity deleted successfully",
      });
      if (selectedActivity) {
        setSelectedActivity(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete activity",
        variant: "destructive",
      });
    },
  });

  const addLogMutation = useMutation({
    mutationFn: ({ activityId, entry, entryDate }: { activityId: number; entry: string; entryDate: string }) =>
      apiRequest("POST", `/api/activities/${activityId}/logs`, {
        entry,
        entryDate: new Date(entryDate),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities", selectedActivity?.id, "logs"] });
      toast({
        title: t('common.success'),
        description: t('activities.logEntryAdded'),
      });
      setLogEntry("");
      setLogDate(new Date().toISOString().split('T')[0]);
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('activities.logEntryFailed'),
        variant: "destructive",
      });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "normal": return "bg-orange-100 text-orange-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "planned": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsEditActivityModalOpen(true);
  };

  const handleAddLogEntry = () => {
    if (!selectedActivity || !logEntry.trim()) return;
    
    addLogMutation.mutate({
      activityId: selectedActivity.id,
      entry: logEntry,
      entryDate: logDate,
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ms-blue micro-spinner"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Activities List */}
      <div className="w-full md:w-1/2 border-r-0 md:border-r border-gray-200 overflow-y-auto">
        <div className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6 gap-3">
          <h2 className="text-lg md:text-xl font-semibold text-neutral-dark">{t('activities.title')}</h2>
          <Button
            onClick={() => setIsNewActivityModalOpen(true)}
            className="bg-ms-blue hover:bg-ms-blue-dark text-white w-full sm:w-auto micro-button-press micro-ripple micro-hover-lift"
            size="sm"
          >
            <Plus size={16} className="mr-2" />
{t('activities.addNew')}
          </Button>
        </div>

        <div className="space-y-4">
          {activities?.map((activity) => (
            <Card
              key={activity.id}
              className={`cursor-pointer micro-card micro-button-press micro-fadeIn ${
                selectedActivity?.id === activity.id ? "ring-2 ring-ms-blue" : ""
              }`}
              onClick={() => setSelectedActivity(activity)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-neutral-dark">{activity.title}</CardTitle>
                    <p className="text-sm text-neutral-medium mt-1">{activity.description}</p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedActivity(activity);
                        setIsTaskDetailModalOpen(true);
                      }}
                      className="text-ms-blue hover:text-ms-blue-dark"
                      title={t('activities.viewDetails')}
                    >
                      <Eye size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditActivity(activity);
                      }}
                      className="text-ms-blue hover:text-ms-blue-dark"
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteActivityMutation.mutate(activity.id);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge className={getPriorityColor(activity.priority)}>
                      {activity.priority}
                    </Badge>
                    <Badge className={getStatusColor(activity.status)}>
                      {activity.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {activity.dueDate && (
                    <span className="text-sm text-neutral-medium">
                      Due: {format(new Date(activity.dueDate), "MMM dd, yyyy")}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {!activities?.length && (
            <div className="text-center py-12">
              <p className="text-neutral-medium">{t('activities.noActivitiesFound')}</p>
              <Button
                onClick={() => setIsNewActivityModalOpen(true)}
                className="mt-4 bg-ms-blue hover:bg-ms-blue-dark text-white"
              >
                {t('activities.createFirst')}
              </Button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Activity Details & Logs */}
      <div className="flex-1 overflow-y-auto border-t md:border-t-0 border-gray-200">
        <div className="p-3 sm:p-4">
        {selectedActivity ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-neutral-dark mb-2">
                {selectedActivity.title}
              </h2>
              <p className="text-neutral-medium mb-4">{selectedActivity.description}</p>
              
              <div className="flex items-center space-x-4 mb-6">
                <Badge className={getPriorityColor(selectedActivity.priority)}>
                  {selectedActivity.priority}
                </Badge>
                <Badge className={getStatusColor(selectedActivity.status)}>
                  {selectedActivity.status.replace("_", " ")}
                </Badge>
                {selectedActivity.dueDate && (
                  <span className="text-sm text-neutral-medium">
                    Due: {format(new Date(selectedActivity.dueDate), "MMM dd, yyyy")}
                  </span>
                )}
              </div>
            </div>

            {/* Add Log Entry */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('activities.addLogEntry')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-dark mb-2">
{t('activities.entryDate')}
                  </label>
                  <Input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-dark mb-2">
{t('activities.logEntry')}
                  </label>
                  <Textarea
                    placeholder={t('forms.enterText')}
                    value={logEntry}
                    onChange={(e) => setLogEntry(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleAddLogEntry}
                  disabled={!logEntry.trim() || addLogMutation.isPending}
                  className="bg-ms-blue hover:bg-ms-blue-dark text-white"
                >
{addLogMutation.isPending ? t('common.loading') : t('activities.addLogEntry')}
                </Button>
              </CardContent>
            </Card>

            {/* Activity Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('activities.activityLogs')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activityLogs?.map((log) => (
                    <div key={log.id} className="border-l-4 border-ms-blue pl-4 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-neutral-dark">
                          {log.entryDate ? format(new Date(log.entryDate), "MMM dd, yyyy") : "No date"}
                        </span>
                        <span className="text-xs text-neutral-medium">
                          {format(new Date(log.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-medium">{log.entry}</p>
                    </div>
                  ))}

                  {!activityLogs?.length && (
                    <p className="text-neutral-medium text-center py-4">
{t('activities.noLogsYet')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-neutral-medium text-lg mb-4">Select an activity to view details</p>
              <p className="text-neutral-medium">
                Choose an activity from the list to see its details and log entries
              </p>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Modals */}
      <NewActivityModal
        open={isNewActivityModalOpen}
        onOpenChange={setIsNewActivityModalOpen}
      />

      <EditActivityModal
        open={isEditActivityModalOpen}
        onOpenChange={setIsEditActivityModalOpen}
        activity={selectedActivity}
      />

      {selectedActivity && (
        <TaskDetailModal
          activity={selectedActivity}
          isOpen={isTaskDetailModalOpen}
          onClose={() => setIsTaskDetailModalOpen(false)}
        />
      )}
    </div>
  );
}
