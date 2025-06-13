import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, CheckCircle, Clock, AlertTriangle, Users, Calendar, Target, Zap, Construction, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Subtask, Activity, Contact } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/hooks/useTranslations";
import AppLayout from "@/components/layout/AppLayout";
import EditSubtaskModal from "@/components/modals/EditSubtaskModal";

export default function Subtasks() {
  const { t } = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "quick_win" | "roadblock">("all");
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);

  const { data: subtasks = [], isLoading: subtasksLoading, error: subtasksError } = useQuery<Subtask[]>({
    queryKey: ["/api/subtasks"],
    queryFn: async () => {
      console.log("Fetching subtasks with GET method");
      const response = await fetch("/api/subtasks", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Subtasks fetch error:", response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Subtasks data received:", data);
      return Array.isArray(data) ? data : [];
    },
    retry: 3,
    retryDelay: 1000,
  });

  const { data: activities } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: currentUser } = useQuery<{ user: any }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: taskCompletions = [] } = useQuery<Array<{activityId: number, completed: boolean}>>({
    queryKey: ["/api/daily-task-completions"],
  });

  const updateParticipantTypeMutation = useMutation({
    mutationFn: async ({ subtaskId, participantEmail, taskType }: { 
      subtaskId: number; 
      participantEmail: string; 
      taskType: string; 
    }) => {
      return apiRequest(`/api/subtasks/${subtaskId}/participant-type`, "PATCH", { 
        participantEmail, 
        taskType 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subtasks"] });
      toast({
        title: t("success"),
        description: t("subtaskTypeUpdated"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("failedToUpdateSubtaskType"),
        variant: "destructive",
      });
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

  // Create maps for lookup
  const activityMap = activities?.reduce((acc, activity) => {
    acc[activity.id] = activity;
    return acc;
  }, {} as Record<number, Activity>) || {};

  const contactMap = contacts?.reduce((acc, contact) => {
    acc[contact.email] = contact;
    return acc;
  }, {} as Record<string, Contact>) || {};

  // Create completion status map for sync with Today's Tasks
  const completionMap = taskCompletions.reduce((acc, completion: any) => {
    acc[completion.activityId] = completion.completed;
    return acc;
  }, {} as Record<number, boolean>);

  // Filter subtasks based on search and type
  const filteredSubtasks = (subtasks || []).filter(subtask => {
    const matchesSearch = 
      subtask.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subtask.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activityMap[subtask.linkedActivityId]?.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Get the effective task type (participant-specific or base type)
    const userEmail = currentUser?.user?.email;
    const effectiveType = userEmail && subtask.participantTypes 
      ? (subtask.participantTypes as Record<string, string>)[userEmail] || subtask.type
      : subtask.type;
    
    // For type filters, exclude completed/resolved items (only show actionable ones)
    if (selectedType === "quick_win") {
      return matchesSearch && effectiveType === "quick_win" && 
             subtask.status !== "completed" && subtask.status !== "resolved";
    }
    if (selectedType === "roadblock") {
      return matchesSearch && effectiveType === "roadblock" && 
             subtask.status !== "completed" && subtask.status !== "resolved";
    }
    
    // For "all", show everything
    const matchesType = selectedType === "all" || effectiveType === selectedType;
    return matchesSearch && matchesType;
  }) || [];

  // Group subtasks by status
  const subtasksByStatus = {
    pending: filteredSubtasks.filter(s => s.status === "pending"),
    in_progress: filteredSubtasks.filter(s => s.status === "in_progress"),
    completed: filteredSubtasks.filter(s => s.status === "completed").sort((a, b) => {
      // Sort completed tasks by completion date (descending - most recent first)
      if (a.completedDate && b.completedDate) {
        return new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime();
      }
      if (a.completedDate && !b.completedDate) return -1;
      if (!a.completedDate && b.completedDate) return 1;
      return 0;
    }),
    resolved: filteredSubtasks.filter(s => s.status === "resolved").sort((a, b) => {
      // Sort resolved tasks by completion date (descending - most recent first)  
      if (a.completedDate && b.completedDate) {
        return new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime();
      }
      if (a.completedDate && !b.completedDate) return -1;
      if (!a.completedDate && b.completedDate) return 1;
      return 0;
    }),
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "quick_win": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "roadblock": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": 
      case "resolved": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "in_progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const updateSubtaskMutation = useMutation({
    mutationFn: (data: { id: number; updates: Partial<Subtask> }) =>
      apiRequest(`/api/subtasks/${data.id}`, "PUT", data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Succes",
        description: "Subtaak succesvol bijgewerkt",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout",
        description: error.message || "Kon subtaak niet bijwerken",
        variant: "destructive",
      });
    },
  });

  const toggleSubtaskStatus = (subtask: Subtask) => {
    const newStatus = subtask.status === "completed" || subtask.status === "resolved" 
      ? "pending" 
      : subtask.type === "quick_win" ? "completed" : "resolved";
    
    updateSubtaskMutation.mutate({
      id: subtask.id,
      updates: { 
        status: newStatus,
        completedDate: (newStatus === "completed" || newStatus === "resolved") ? new Date() : null
      }
    });
    
    // Also update daily task completion to sync with Today's Tasks
    const todayString = format(new Date(), "yyyy-MM-dd");
    toggleTaskCompletion.mutate({
      activityId: subtask.id,
      completed: newStatus === "completed" || newStatus === "resolved"
    });
  };

  const toggleTaskCompletion = useMutation({
    mutationFn: async ({ activityId, completed }: { activityId: number; completed: boolean }) => {
      const todayString = format(new Date(), "yyyy-MM-dd");
      return apiRequest(`/api/daily-task-completions`, "POST", {
        activityId,
        taskDate: todayString,
        completed,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-task-completions"] });
    },
  });

  const renderSubtaskCard = (subtask: Subtask) => {
    const linkedActivity = activityMap[subtask.linkedActivityId];
    const isOverdue = subtask.dueDate && new Date(subtask.dueDate) < new Date() && 
                     subtask.status !== "completed" && subtask.status !== "resolved";
    const isCompletedDaily = completionMap[subtask.id] || false;
    
    // Get the effective task type for display (participant-specific or base type)
    const userEmail = currentUser?.user?.email;
    const effectiveType = userEmail && subtask.participantTypes 
      ? (subtask.participantTypes as Record<string, string>)[userEmail] || subtask.type
      : subtask.type;

    return (
      <Card key={subtask.id} className={`transition-all hover:shadow-md ${isOverdue ? "ring-2 ring-red-200" : ""}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-sm font-medium mb-2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSubtaskStatus(subtask)}
                  className="p-1 h-6 w-6"
                  disabled={updateSubtaskMutation.isPending}
                >
                  <CheckCircle className={`h-4 w-4 ${
                    subtask.status === "completed" || subtask.status === "resolved" || isCompletedDaily
                      ? "text-green-600" : "text-gray-400"
                  }`} />
                </Button>
                <span className={subtask.status === "completed" || subtask.status === "resolved" || isCompletedDaily ? "line-through text-gray-500" : ""}>
                  {subtask.title}
                </span>
              </CardTitle>
              <div className="flex gap-2 mb-2">
                <Badge className={getTypeColor(effectiveType)}>
                  {effectiveType === "quick_win" ? "Quick Win" : 
                   effectiveType === "roadblock" ? "Wegversperring" : "Taak"}
                </Badge>
                <Badge className={getStatusColor(subtask.status)}>
                  {subtask.status === "pending" ? "In wachtrij" :
                   subtask.status === "in_progress" ? "In uitvoering" :
                   subtask.status === "completed" ? "Voltooid" : "Opgelost"}
                </Badge>
                <Badge className={getPriorityColor(subtask.priority)}>
                  {subtask.priority === "high" ? "Hoog" :
                   subtask.priority === "medium" ? "Gemiddeld" : "Laag"}
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
              <span className="font-medium">Gekoppeld aan:</span>
              <span>{linkedActivity?.title || "Onbekende activiteit"}</span>
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
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  <span>Deelnemers: {subtask.participants.length}</span>
                </div>
                
                {/* Participant Task Type Selection */}
                {currentUser?.user?.email && subtask.participants.includes(currentUser.user.email) && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4" />
                      <span className="text-sm font-medium">Jouw taaktype voor AI planning:</span>
                    </div>
                    <Select
                      value={(subtask.participantTypes as Record<string, string>)?.[currentUser.user.email] || subtask.type}
                      onValueChange={(value) => {
                        updateParticipantTypeMutation.mutate({
                          subtaskId: subtask.id,
                          participantEmail: currentUser.user.email,
                          taskType: value,
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="task">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Normale Taak
                          </div>
                        </SelectItem>
                        <SelectItem value="quick_win">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Quick Win
                          </div>
                        </SelectItem>
                        <SelectItem value="roadblock">
                          <div className="flex items-center gap-2">
                            <Construction className="h-4 w-4" />
                            Wegversperring
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="flex gap-1">
                  {subtask.participants.slice(0, 3).map((email, idx) => {
                    const contact = contactMap[email];
                    return (
                      <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                        {contact?.name || email.split('@')[0]}
                      </span>
                    );
                  })}
                  {subtask.participants.length > 3 && (
                    <span className="text-xs">+{subtask.participants.length - 3}</span>
                  )}
                </div>
              </div>
            )}
            
            {subtask.completedDate && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Voltooid: {format(new Date(subtask.completedDate), "dd/MM/yyyy")}</span>
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
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Actiepunten</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Beheer Quick Wins en Wegversperringen gekoppeld aan je activiteiten. 
            Deelnemers die ook toegang hebben tot het platform zullen deze actiepunten zien in hun eigen agenda's.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Zoek actiepunten..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("all")}
            >
              Alle
            </Button>
            <Button
              variant={selectedType === "quick_win" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("quick_win")}
            >
              Quick Wins
            </Button>
            <Button
              variant={selectedType === "roadblock" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("roadblock")}
            >
              Wegversperringen
            </Button>
          </div>
        </div>

        {subtasksError ? (
          <Card>
            <CardContent className="text-center py-8">
              <h3 className="text-lg font-medium text-red-600 mb-2">
                Fout bij laden van subtaken
              </h3>
              <p className="text-red-500 text-sm mb-4">
                {subtasksError.message || "Onbekende fout"}
              </p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/subtasks"] })}
                variant="outline"
              >
                Opnieuw proberen
              </Button>
            </CardContent>
          </Card>
        ) : subtasksLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">Subtaken laden...</div>
          </div>
        ) : filteredSubtasks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Geen subtaken gevonden
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || selectedType !== "all" 
                  ? "Geen subtaken komen overeen met je zoekfilters"
                  : "Je hebt nog geen subtaken aangemaakt"
                }
              </p>

            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Pending */}
            {subtasksByStatus.pending.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  In wachtrij ({subtasksByStatus.pending.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {subtasksByStatus.pending.map(renderSubtaskCard)}
                </div>
              </div>
            )}

            {/* In Progress */}
            {subtasksByStatus.in_progress.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  In uitvoering ({subtasksByStatus.in_progress.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {subtasksByStatus.in_progress.map(renderSubtaskCard)}
                </div>
              </div>
            )}

            {/* Completed/Resolved */}
            {(subtasksByStatus.completed.length > 0 || subtasksByStatus.resolved.length > 0) && (
              <div>
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="w-full text-left mb-3 flex items-center gap-2 text-lg font-semibold hover:text-green-600 transition-colors"
                >
                  {showCompleted ? (
                    <ChevronDown className="h-5 w-5 text-green-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-green-500" />
                  )}
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Voltooid ({subtasksByStatus.completed.length + subtasksByStatus.resolved.length})
                </button>
                {showCompleted && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...subtasksByStatus.completed, ...subtasksByStatus.resolved].map(renderSubtaskCard)}
                  </div>
                )}
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