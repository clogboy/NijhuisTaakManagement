import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Search, Activity as ActivityIcon, AlertCircle, User, ListChecks, Clock, BarChart3, Plus, Shield } from "lucide-react";
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
import BlameAnalytics from "@/components/roadblocks/BlameAnalytics";
import StreamlinedRoadblockForm from "@/components/roadblocks/StreamlinedRoadblockForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OORZAAK_CATEGORIES, OORZAAK_FACTORS } from "@shared/schema";

export default function Roadblocks() {
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
    taskType: 'roadblock',
    taskTitle: ''
  });

  const { data: roadblocks, isLoading: roadblocksLoading } = useQuery<Roadblock[]>({
    queryKey: ["/api/roadblocks"],
  });

  const { data: subtasks = [] } = useQuery<any[]>({
    queryKey: ["/api/subtasks"],
  });

  const { data: activities } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
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

  const [rescueModalOpen, setRescueModalOpen] = useState(false);
  const [rescuingSubtask, setRescuingSubtask] = useState<any>(null);
  const [proposedResolution, setProposedResolution] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [oorzaakCategory, setOorzaakCategory] = useState("");
  const [oorzaakFactor, setOorzaakFactor] = useState("");
  const [severity, setSeverity] = useState("medium");

  const rescueSubtaskMutation = useMutation({
    mutationFn: async ({ 
      subtaskId, 
      proposedResolution, 
      newDeadline, 
      oorzaakCategory, 
      oorzaakFactor, 
      severity 
    }: { 
      subtaskId: number, 
      proposedResolution: string, 
      newDeadline: string,
      oorzaakCategory: string,
      oorzaakFactor: string,
      severity: string
    }) => {
      const response = await fetch(`/api/subtasks/${subtaskId}/rescue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          proposedResolution, 
          newDeadline, 
          oorzaakCategory, 
          oorzaakFactor, 
          severity 
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to rescue subtask");
      }
      
      return response.json();
    },
    onSuccess: (_, { subtaskId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roadblocks"] });
      
      const subtask = subtasks.find(s => s.id === subtaskId);
      if (subtask) {
        setCelebration({
          isVisible: true,
          taskType: 'roadblock',
          taskTitle: `Rescued: ${subtask.title}`
        });
      }
      
      setRescueModalOpen(false);
      setRescuingSubtask(null);
      
      toast({
        title: "Rescue Successful",
        description: "High-priority resolution task created in the same dossier",
      });
    },
    onError: (error) => {
      toast({
        title: "Rescue Failed",
        description: "Failed to rescue task. Please try again.",
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
      
      if (status === 'resolved' || status === 'completed') {
        const subtask = subtasks.find(s => s.id === subtaskId);
        if (subtask) {
          setCelebration({
            isVisible: true,
            taskType: 'roadblock',
            taskTitle: subtask.title
          });
        }
      }
      
      toast({
        title: t('common.success'),
        description: "Wegversperring status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: "Failed to update roadblock status",
        variant: "destructive",
      });
    },
  });

  // Create a map of activity IDs to activity titles
  const activityMap = activities?.reduce((acc, activity) => {
    acc[activity.id] = activity;
    return acc;
  }, {} as Record<number, Activity>) || {};

  // Filter subtasks that are classified as roadblocks by participants and exclude completed ones
  const roadblockSubtasks = (subtasks as any[]).filter((subtask: any) => {
    // Handle both camelCase and snake_case field names for compatibility
    const participantTypes = (subtask.participantTypes || subtask.participant_types || {}) as Record<string, string>;
    const isRoadblock = subtask.type === "roadblock" || 
                       Object.values(participantTypes).includes("roadblock") ||
                       subtask.status === "roadblock";
    const isNotCompleted = subtask.status !== "completed" && subtask.status !== "resolved" && !subtask.completedDate && !subtask.completed_date;
    
    // Debug logging for all subtasks
    console.log(`Subtask ${subtask.id} (${subtask.title}):`, {
      type: subtask.type,
      status: subtask.status,
      participantTypes,
      participantValues: Object.values(participantTypes),
      includesRoadblock: Object.values(participantTypes).includes("roadblock"),
      isRoadblock,
      isNotCompleted,
      finalResult: isRoadblock && isNotCompleted
    });
    
    return isRoadblock && isNotCompleted;
  });

  // Filter roadblock subtasks based on search query
  const filteredRoadblockSubtasks = roadblockSubtasks.filter((subtask: any) =>
    subtask.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subtask.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activityMap[subtask.linkedActivityId]?.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'process': return '⚙️';
      case 'resources': return '💰';
      case 'communication': return '💬';
      case 'external': return '🌐';
      case 'technical': return '🔧';
      case 'planning': return '📋';
      case 'skills': return '🎓';
      default: return '❓';
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
              Track and analyze systemic obstacles that impact productivity
            </p>
          </div>
        </div>

        <Tabs defaultValue="roadblocks" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="roadblocks" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Roadblocks
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Systemic Analysis
            </TabsTrigger>
            <TabsTrigger value="new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Report New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roadblocks" className="space-y-6">
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
                  {roadblocks?.length === 0 && roadblockSubtasks.length === 0 ? "No roadblocks reported yet" : "No roadblocks match your search"}
                </p>
                <p className="text-neutral-medium">
                  {roadblocks?.length === 0 && roadblockSubtasks.length === 0
                    ? "Use the 'Report New' tab to document obstacles"
                    : "Try adjusting your search criteria"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Traditional Roadblocks */}
                {filteredRoadblocks.length > 0 && (
                  <div className="grid gap-6 lg:grid-cols-3">
                    {/* Open, In Progress, Resolved columns */}
                    {['open', 'in_progress', 'resolved'].map((status) => (
                      <div key={status}>
                        <h2 className="text-lg font-semibold text-neutral-dark dark:text-white mb-4 flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-sm ${getStatusColor(status)}`}>
                            {status === 'open' ? 'Open' : status === 'in_progress' ? 'In Progress' : 'Resolved'} ({roadblocksByStatus[status as keyof typeof roadblocksByStatus].length})
                          </span>
                        </h2>
                        <div className="space-y-4">
                          {roadblocksByStatus[status as keyof typeof roadblocksByStatus].map((roadblock) => {
                            const linkedActivity = activityMap[roadblock.linkedActivityId];
                            return (
                              <Card key={roadblock.id} className={`hover:shadow-md transition-shadow border-l-4 ${
                                status === 'open' ? 'border-l-red-500' : 
                                status === 'in_progress' ? 'border-l-yellow-500' : 'border-l-green-500'
                              }`}>
                                <CardHeader className="pb-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <CardTitle className="text-base text-neutral-dark dark:text-white flex items-center gap-2">
                                        <span>{getSeverityIcon(roadblock.severity)}</span>
                                        <span>{getCategoryIcon(roadblock.oorzaakCategory)}</span>
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
                                      {roadblock.oorzaakCategory && roadblock.oorzaakCategory !== 'unclear' && (
                                        <Badge variant="outline" className="text-xs">
                                          {roadblock.oorzaakCategory}
                                        </Badge>
                                      )}
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
                          
                          {roadblocksByStatus[status as keyof typeof roadblocksByStatus].length === 0 && (
                            <div className="text-center py-8 text-neutral-medium dark:text-gray-400">
                              No {status.replace('_', ' ')} roadblocks
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subtasks Classified as Roadblocks */}
                {filteredRoadblockSubtasks.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-dark dark:text-white mb-4 flex items-center gap-2">
                      <ListChecks className="h-5 w-5" />
                      Task Roadblocks ({filteredRoadblockSubtasks.length})
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
                                      Roadblock
                                    </Badge>
                                    <Badge className={`${
                                      subtask.status === "completed" || subtask.status === "resolved" 
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                        : subtask.status === "in_progress" 
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                        : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                    }`}>
                                      {subtask.status === "pending" ? "Pending" :
                                       subtask.status === "in_progress" ? "In Progress" :
                                       subtask.status === "completed" ? "Completed" : "Resolved"}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingSubtask(subtask);
                                      setIsEditModalOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => {
                                      setRescuingSubtask(subtask);
                                      setRescueModalOpen(true);
                                    }}
                                  >
                                    <Shield className="h-4 w-4 mr-1" />
                                    Rescue
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <BlameAnalytics roadblocks={roadblocks || []} />
          </TabsContent>

          <TabsContent value="new" className="space-y-6">
            <div className="max-w-2xl">
              <Card>
                <CardHeader>
                  <CardTitle>Nieuwe Wegversperring Aanmaken</CardTitle>
                  <p className="text-sm text-neutral-medium">
                    Maak een nieuwe wegversperring aan door een bestaande taak te selecteren of handmatig in te voeren.
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-medium">
                    Gebruik de rescue functie in de dashboard voor automatische wegversperring creatie van achterstallige taken.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Subtask Modal */}
        <EditSubtaskModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          subtask={editingSubtask}
        />

        {/* Rescue Modal */}
        <Dialog open={rescueModalOpen} onOpenChange={setRescueModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Rescue Task: {rescuingSubtask?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="oorzaak-category">Root Cause Category</Label>
                  <Select value={oorzaakCategory} onValueChange={setOorzaakCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(OORZAAK_CATEGORIES).map(([key, value]) => (
                        <SelectItem key={key} value={key}>{value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="severity">Severity</Label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {oorzaakCategory && OORZAAK_FACTORS[oorzaakCategory as keyof typeof OORZAAK_FACTORS] && (
                <div>
                  <Label htmlFor="oorzaak-factor">Specific Factor</Label>
                  <Select value={oorzaakFactor} onValueChange={setOorzaakFactor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select specific factor" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(OORZAAK_FACTORS[oorzaakCategory as keyof typeof OORZAAK_FACTORS] || {}).map(([key, value]) => (
                        <SelectItem key={key} value={key}>{String(value)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="proposed-resolution">Proposed Resolution</Label>
                <Textarea
                  id="proposed-resolution"
                  placeholder="Describe how you plan to resolve this roadblock..."
                  value={proposedResolution}
                  onChange={(e) => setProposedResolution(e.target.value)}
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="new-deadline">New Deadline</Label>
                <Input
                  id="new-deadline"
                  type="datetime-local"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRescueModalOpen(false);
                    setRescuingSubtask(null);
                    setProposedResolution("");
                    setNewDeadline("");
                    setOorzaakCategory("");
                    setOorzaakFactor("");
                    setSeverity("medium");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (rescuingSubtask && proposedResolution && newDeadline && oorzaakCategory) {
                      rescueSubtaskMutation.mutate({
                        subtaskId: rescuingSubtask.id,
                        proposedResolution,
                        newDeadline,
                        oorzaakCategory,
                        oorzaakFactor,
                        severity
                      });
                    }
                  }}
                  disabled={!proposedResolution || !newDeadline || !oorzaakCategory || rescueSubtaskMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {rescueSubtaskMutation.isPending ? "Creating Rescue Task..." : "Create Rescue Task"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <TaskCelebration
          isVisible={celebration.isVisible}
          taskType={celebration.taskType}
          taskTitle={celebration.taskTitle}
          onComplete={() => setCelebration({ ...celebration, isVisible: false })}
        />
      </div>
    </AppLayout>
  );
}