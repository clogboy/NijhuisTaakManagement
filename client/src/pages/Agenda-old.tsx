import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/hooks/useTranslations";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Calendar, 
  Clock, 
  Target, 
  Zap, 
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  Settings,
  Play,
  RefreshCw,
  AlertCircle,
  Edit2,
  Trash2,
  Save,
  X,
  User,
  Users,
  Shield,
  Activity as ActivityIcon
} from "lucide-react";
import { Activity, WeeklyEthos } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";

interface PriorityMatrix {
  urgentImportant: Activity[];
  importantNotUrgent: Activity[];
  urgentNotImportant: Activity[];
  neitherUrgentNorImportant: Activity[];
}

interface AgendaSuggestion {
  priorityMatrix: PriorityMatrix;
  suggestions: string;
  taskSwitchOptimization: string;
  estimatedTaskSwitches: number;
  scheduledActivities: number[];
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" }
];

export default function Agenda() {
  const { t } = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [maxTaskSwitches, setMaxTaskSwitches] = useState(3);
  const [editingEthos, setEditingEthos] = useState<WeeklyEthos | null>(null);
  const [newEthos, setNewEthos] = useState({
    dayOfWeek: new Date().getDay(),
    ethos: "",
    description: "",
    focusAreas: [] as string[],
    maxTaskSwitches: 3,
    preferredWorkBlocks: 2
  });

  // Flow strategy queries
  const { data: personalityPresets } = useQuery<any[]>({
    queryKey: ["/api/flow/personality-presets"],
  });

  const { data: currentStrategy } = useQuery<any>({
    queryKey: ["/api/flow/current-strategy"],
  });

  const { data: activities } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const { data: priorityMatrix } = useQuery<PriorityMatrix>({
    queryKey: ["/api/priority-matrix", selectedDate],
  });

  // Scheduler status query
  const { data: schedulerStatus } = useQuery<{
    isRunning: boolean;
    nextMidnight: string;
    currentTime: string;
  }>({
    queryKey: ["/api/scheduler/status"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const generateAgendaMutation = useMutation({
    mutationFn: async (data: { date: string; maxTaskSwitches: number }) => {
      const response = await apiRequest("/api/agenda/generate", "POST", data);
      return response as unknown as AgendaSuggestion;
    },
    onSuccess: (data: AgendaSuggestion) => {
      setAgendaSuggestion(data);
      toast({
        title: "AI Agenda Generated",
        description: "Your optimized daily schedule is ready",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate agenda",
        variant: "destructive",
      });
    },
  });

  // Flow strategy mutation
  const applyPresetMutation = useMutation({
    mutationFn: (personalityType: string) => 
      apiRequest("/api/flow/apply-preset", "POST", { personalityType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flow/current-strategy"] });
      toast({
        title: "Flow Strategy Applied",
        description: "Your personality-based flow strategy has been activated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply flow strategy",
        variant: "destructive",
      });
    },
  });

  const updateEthosMutation = useMutation({
    mutationFn: ({ id, ...ethos }: { id: number } & Partial<WeeklyEthos>) =>
      apiRequest(`/api/ethos/${id}`, "PUT", ethos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ethos"] });
      setEditingEthos(null);
      toast({
        title: "Success",
        description: "Weekly ethos updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update ethos",
        variant: "destructive",
      });
    },
  });

  const deleteEthosMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/ethos/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ethos"] });
      toast({
        title: "Success",
        description: "Weekly ethos deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete ethos",
        variant: "destructive",
      });
    },
  });

  const [agendaSuggestion, setAgendaSuggestion] = useState<AgendaSuggestion | null>(null);
  const [lastTriggerTime, setLastTriggerTime] = useState<number | null>(null);

  // Check if scheduler trigger is on cooldown (30 minutes)
  const isOnCooldown = Boolean(lastTriggerTime && (Date.now() - lastTriggerTime) < 30 * 60 * 1000);
  const cooldownMinutesLeft = lastTriggerTime ? Math.ceil((30 * 60 * 1000 - (Date.now() - lastTriggerTime)) / (1000 * 60)) : 0;

  // Scheduler trigger mutation with cooldown tracking
  const triggerSchedulerMutation = useMutation({
    mutationFn: () => apiRequest("/api/scheduler/trigger", "POST"),
    onSuccess: () => {
      setLastTriggerTime(Date.now());
      queryClient.invalidateQueries({ queryKey: ["/api/scheduler/status"] });
      toast({
        title: "Daily Sync Triggered",
        description: "Automated scheduling has been initiated for tomorrow's tasks",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to trigger scheduler. Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateAgenda = () => {
    generateAgendaMutation.mutate({
      date: selectedDate,
      maxTaskSwitches: maxTaskSwitches
    });
  };

  const handleCreateEthos = () => {
    createEthosMutation.mutate(newEthos);
  };

  const handleEditEthos = (ethos: WeeklyEthos) => {
    setEditingEthos({ ...ethos });
  };

  const handleUpdateEthos = () => {
    if (!editingEthos) return;
    updateEthosMutation.mutate(editingEthos);
  };

  const handleCancelEdit = () => {
    setEditingEthos(null);
  };

  const getQuadrantColor = (quadrant: string) => {
    switch (quadrant) {
      case "urgentImportant": return "border-red-500 bg-red-50";
      case "importantNotUrgent": return "border-green-500 bg-green-50";
      case "urgentNotImportant": return "border-yellow-500 bg-yellow-50";
      case "neitherUrgentNorImportant": return "border-gray-500 bg-gray-50";
      default: return "border-gray-300 bg-gray-50";
    }
  };

  const getQuadrantTitle = (quadrant: string) => {
    switch (quadrant) {
      case "urgentImportant": return "Do First (Urgent & Important)";
      case "importantNotUrgent": return "Schedule (Important, Not Urgent)";
      case "urgentNotImportant": return "Delegate (Urgent, Not Important)";
      case "neitherUrgentNorImportant": return "Eliminate (Neither)";
      default: return "Unknown";
    }
  };

  const getQuadrantIcon = (quadrant: string) => {
    switch (quadrant) {
      case "urgentImportant": return <AlertTriangle className="text-red-600" size={20} />;
      case "importantNotUrgent": return <Target className="text-green-600" size={20} />;
      case "urgentNotImportant": return <Clock className="text-yellow-600" size={20} />;
      case "neitherUrgentNorImportant": return <CheckCircle2 className="text-gray-600" size={20} />;
      default: return null;
    }
  };

  const getTodayEthos = () => {
    const today = new Date(selectedDate).getDay();
    return weeklyEthos?.find(ethos => ethos.dayOfWeek === today);
  };

  // Use effect to refresh cooldown timer
  useEffect(() => {
    if (isOnCooldown) {
      const interval = setInterval(() => {
        if (lastTriggerTime && (Date.now() - lastTriggerTime) >= 30 * 60 * 1000) {
          setLastTriggerTime(null);
        }
      }, 60000); // Check every minute
      
      return () => clearInterval(interval);
    }
  }, [isOnCooldown, lastTriggerTime]);

  return (
    <AppLayout title="AI Agenda" subtitle="Intelligent time management with priority-based planning">
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-4">
          <Tabs defaultValue="today" className="space-y-4 md:space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="today" className="text-xs sm:text-sm">Today's Agenda</TabsTrigger>
              <TabsTrigger value="flow" className="text-xs sm:text-sm">Flow Strategy</TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="space-y-4 md:space-y-6">
              {/* Date and Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar size={20} />
                  Daily Agenda Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Date</label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Task Switches</label>
                    <Select value={maxTaskSwitches.toString()} onValueChange={(value) => setMaxTaskSwitches(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Switch</SelectItem>
                        <SelectItem value="2">2 Switches</SelectItem>
                        <SelectItem value="3">3 Switches</SelectItem>
                        <SelectItem value="4">4 Switches</SelectItem>
                        <SelectItem value="5">5 Switches</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleGenerateAgenda}
                      disabled={generateAgendaMutation.isPending}
                      className="w-full bg-ms-blue hover:bg-ms-blue-dark text-white"
                    >
                      <Brain size={16} className="mr-2" />
                      {generateAgendaMutation.isPending ? t("common.loading") : t("agenda.generateAgenda")}
                    </Button>
                  </div>
                </div>

                {/* Scheduler Trigger Panel */}
                <div className="border-t pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white">Daily Scheduler</h4>
                      <p className="text-xs sm:text-sm text-gray-500">Trigger automated agenda generation and task scheduling</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      {schedulerStatus && (
                        <Badge variant={schedulerStatus.isRunning ? "default" : "secondary"} className="text-xs">
                          {schedulerStatus.isRunning ? "Active" : "Inactive"}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => triggerSchedulerMutation.mutate()}
                        disabled={triggerSchedulerMutation.isPending || isOnCooldown}
                        className={`${isOnCooldown ? "opacity-50" : ""} text-xs sm:text-sm`}
                      >
                        <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${triggerSchedulerMutation.isPending ? 'animate-spin' : ''}`} />
                        {triggerSchedulerMutation.isPending 
                          ? "Running..." 
                          : isOnCooldown 
                            ? `Wait ${cooldownMinutesLeft}m` 
                            : "Trigger Sync"}
                      </Button>
                    </div>
                  </div>
                  
                  {schedulerStatus?.nextMidnight && (
                    <div className="mt-2 text-xs text-gray-500">
                      Next automatic sync: {new Date(schedulerStatus.nextMidnight).toLocaleDateString()} at midnight
                    </div>
                  )}
                </div>

                {/* Today's Ethos */}
                {(() => {
                  const todayEthos = getTodayEthos();
                  return todayEthos && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target size={16} className="text-red-600" />
                        <span className="font-medium text-red-800">Today's Ethos</span>
                      </div>
                      <p className="text-red-700 font-medium">{todayEthos.ethos}</p>
                      <p className="text-red-600 text-sm mt-1">{todayEthos.description}</p>
                      {todayEthos.focusAreas && todayEthos.focusAreas.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {todayEthos.focusAreas.map((area: string) => (
                            <Badge key={area} variant="secondary" className="bg-red-100 text-red-800">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* API Key Status Warning */}
            {!agendaSuggestion && (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-amber-800 dark:text-amber-200">
                        AI Service Currently Unavailable
                      </h3>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        The OpenAI API keys have exceeded their quota. Please check your API billing status or provide updated keys to access AI-powered agenda generation and Eisenhower matrix categorization.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Suggestions */}
            {agendaSuggestion && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb size={20} className="text-yellow-500" />
                      {t("agenda.aiRecommendations")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm text-neutral-medium mb-2">{t("agenda.dailyStrategy")}</h4>
                      <p className="text-sm">{agendaSuggestion?.suggestions || t("agenda.aiServiceUnavailable")}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-neutral-medium mb-2">{t("agenda.taskSwitchOptimization")}</h4>
                      <p className="text-sm">{agendaSuggestion?.taskSwitchOptimization || t("agenda.optimizationUnavailable")}</p>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <span className="text-sm font-medium">{t("agenda.estimatedTaskSwitches")}</span>
                      <Badge variant={(agendaSuggestion?.estimatedTaskSwitches || 0) <= maxTaskSwitches ? "default" : "destructive"}>
                        {agendaSuggestion?.estimatedTaskSwitches || 0} / {maxTaskSwitches}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Play size={20} className="text-green-500" />
                      Scheduled Activities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {agendaSuggestion?.scheduledActivities?.map((activityId, index) => {
                        const activity = activities?.find(a => a.id === activityId);
                        if (!activity) return null;
                        
                        return (
                          <div key={activityId} className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="flex items-center justify-center w-6 h-6 bg-ms-blue text-white rounded-full text-xs font-bold">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{activity.title}</p>
                              <p className="text-xs text-neutral-medium">{activity.description}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {activity.priority}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>



          <TabsContent value="ethos" className="space-y-4 md:space-y-6">
            {/* Create New Ethos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings size={20} />
                  Create Weekly Ethos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Day of Week</label>
                    <Select 
                      value={newEthos.dayOfWeek.toString()} 
                      onValueChange={(value) => setNewEthos({...newEthos, dayOfWeek: parseInt(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Task Switches</label>
                    <Select 
                      value={newEthos.maxTaskSwitches.toString()} 
                      onValueChange={(value) => setNewEthos({...newEthos, maxTaskSwitches: parseInt(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Switch</SelectItem>
                        <SelectItem value="2">2 Switches</SelectItem>
                        <SelectItem value="3">3 Switches</SelectItem>
                        <SelectItem value="4">4 Switches</SelectItem>
                        <SelectItem value="5">5 Switches</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Ethos</label>
                  <Input
                    placeholder="e.g., Deep Focus Monday, Communication Day, Creative Exploration"
                    value={newEthos.ethos}
                    onChange={(e) => setNewEthos({...newEthos, ethos: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Textarea
                    placeholder="Describe the purpose and mindset for this day..."
                    value={newEthos.description}
                    onChange={(e) => setNewEthos({...newEthos, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleCreateEthos}
                  disabled={createEthosMutation.isPending || !newEthos.ethos}
                  className="bg-ms-blue hover:bg-ms-blue-dark text-white"
                >
                  {createEthosMutation.isPending ? "Creating..." : "Create Ethos"}
                </Button>
              </CardContent>
            </Card>

            {/* Existing Ethos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weeklyEthos?.map((ethos) => (
                <Card key={ethos.id} className="border-2 border-ms-blue/20 micro-hover-lift">
                  {editingEthos?.id === ethos.id ? (
                    // Edit Mode
                    <>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <Select 
                            value={editingEthos.dayOfWeek.toString()} 
                            onValueChange={(value) => setEditingEthos({...editingEthos, dayOfWeek: parseInt(value)})}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS_OF_WEEK.map((day) => (
                                <SelectItem key={day.value} value={day.value.toString()}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select 
                            value={editingEthos.maxTaskSwitches.toString()} 
                            onValueChange={(value) => setEditingEthos({...editingEthos, maxTaskSwitches: parseInt(value)})}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="4">4</SelectItem>
                              <SelectItem value="5">5</SelectItem>
                            </SelectContent>
                          </Select>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Input
                            value={editingEthos.ethos}
                            onChange={(e) => setEditingEthos({...editingEthos, ethos: e.target.value})}
                            placeholder="Ethos name"
                            className="font-medium"
                          />
                          <Textarea
                            value={editingEthos.description || ""}
                            onChange={(e) => setEditingEthos({...editingEthos, description: e.target.value})}
                            placeholder="Description"
                            className="mt-2"
                            rows={2}
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={handleUpdateEthos}
                            disabled={updateEthosMutation.isPending || !editingEthos.ethos}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white micro-button-press flex-1"
                          >
                            <Save size={14} className="mr-1" />
                            {updateEthosMutation.isPending ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            size="sm"
                            variant="outline"
                            className="micro-button-press"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </CardContent>
                    </>
                  ) : (
                    // View Mode
                    <>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                          {DAYS_OF_WEEK.find(d => d.value === ethos.dayOfWeek)?.label}
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{ethos.maxTaskSwitches} switches</Badge>
                            <div className="flex gap-1">
                              <Button
                                onClick={() => handleEditEthos(ethos)}
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:bg-blue-50 micro-button-press"
                              >
                                <Edit2 size={12} className="text-blue-600" />
                              </Button>
                              <Button
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this ethos?")) {
                                    deleteEthosMutation.mutate(ethos.id);
                                  }
                                }}
                                size="sm"
                                variant="ghost"
                                disabled={deleteEthosMutation.isPending}
                                className="h-6 w-6 p-0 hover:bg-red-50 micro-button-press"
                              >
                                <Trash2 size={12} className="text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-ms-blue">{ethos.ethos}</h4>
                            <p className="text-sm text-neutral-medium mt-1">{ethos.description}</p>
                          </div>
                          
                          {ethos.focusAreas && ethos.focusAreas.length > 0 && (
                            <div>
                              <h5 className="text-xs font-medium text-neutral-medium mb-2">Focus Areas</h5>
                              <div className="flex flex-wrap gap-1">
                                {ethos.focusAreas.map((area) => (
                                  <Badge key={area} variant="outline" className="text-xs">
                                    {area}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-neutral-medium">
                            <span>Work blocks: {ethos.preferredWorkBlocks}</span>
                            <span>Max switches: {ethos.maxTaskSwitches}</span>
                          </div>
                        </div>
                      </CardContent>
                    </>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}