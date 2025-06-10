import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  RefreshCw
} from "lucide-react";
import { Activity, WeeklyEthos } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";

interface EisenhowerMatrix {
  urgentImportant: Activity[];
  importantNotUrgent: Activity[];
  urgentNotImportant: Activity[];
  neitherUrgentNorImportant: Activity[];
}

interface AgendaSuggestion {
  eisenhowerMatrix: EisenhowerMatrix;
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

  const { data: weeklyEthos } = useQuery<WeeklyEthos[]>({
    queryKey: ["/api/ethos"],
  });

  const { data: activities } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const { data: eisenhowerMatrix } = useQuery<EisenhowerMatrix>({
    queryKey: ["/api/eisenhower", selectedDate],
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
      const response = await apiRequest("POST", "/api/agenda/generate", data);
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

  const createEthosMutation = useMutation({
    mutationFn: (ethos: typeof newEthos) => apiRequest("POST", "/api/ethos", ethos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ethos"] });
      setNewEthos({
        dayOfWeek: new Date().getDay(),
        ethos: "",
        description: "",
        focusAreas: [],
        maxTaskSwitches: 3,
        preferredWorkBlocks: 2
      });
      toast({
        title: "Success",
        description: "Weekly ethos created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ethos",
        variant: "destructive",
      });
    },
  });

  const updateEthosMutation = useMutation({
    mutationFn: ({ id, ...ethos }: { id: number } & Partial<WeeklyEthos>) =>
      apiRequest("PUT", `/api/ethos/${id}`, ethos),
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
    <AppLayout title="AI Agenda" subtitle="Intelligent time management with Eisenhower matrix">
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="today" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Today's Agenda</TabsTrigger>
            <TabsTrigger value="eisenhower">Eisenhower Matrix</TabsTrigger>
            <TabsTrigger value="ethos">Weekly Ethos</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6">
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
                      {generateAgendaMutation.isPending ? "Generating..." : "Generate AI Agenda"}
                    </Button>
                  </div>
                </div>

                {/* Scheduler Trigger Panel */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Daily Scheduler</h4>
                      <p className="text-sm text-gray-500">Trigger automated agenda generation and task scheduling</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {schedulerStatus && (
                        <Badge variant={schedulerStatus.isRunning ? "default" : "secondary"}>
                          {schedulerStatus.isRunning ? "Active" : "Inactive"}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => triggerSchedulerMutation.mutate()}
                        disabled={triggerSchedulerMutation.isPending || isOnCooldown}
                        className={isOnCooldown ? "opacity-50" : ""}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${triggerSchedulerMutation.isPending ? 'animate-spin' : ''}`} />
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

            {/* AI Suggestions */}
            {agendaSuggestion && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb size={20} className="text-yellow-500" />
                      AI Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm text-neutral-medium mb-2">Daily Strategy</h4>
                      <p className="text-sm">{agendaSuggestion.suggestions}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-neutral-medium mb-2">Task Switch Optimization</h4>
                      <p className="text-sm">{agendaSuggestion.taskSwitchOptimization}</p>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <span className="text-sm font-medium">Estimated Task Switches</span>
                      <Badge variant={agendaSuggestion.estimatedTaskSwitches <= maxTaskSwitches ? "default" : "destructive"}>
                        {agendaSuggestion.estimatedTaskSwitches} / {maxTaskSwitches}
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
                      {agendaSuggestion.scheduledActivities.map((activityId, index) => {
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

          <TabsContent value="eisenhower" className="space-y-6">
            {eisenhowerMatrix && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(eisenhowerMatrix).map(([quadrant, quadrantActivities]) => (
                  <Card key={quadrant} className={`border-2 ${getQuadrantColor(quadrant)}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {getQuadrantIcon(quadrant)}
                        {getQuadrantTitle(quadrant)}
                        <Badge variant="secondary" className="ml-auto">
                          {quadrantActivities.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {quadrantActivities.length === 0 ? (
                          <p className="text-sm text-neutral-medium italic">No activities in this quadrant</p>
                        ) : (
                          quadrantActivities.map((activity: any) => (
                            <div key={activity.id} className="p-3 bg-white border rounded-lg">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{activity.title}</p>
                                  <p className="text-xs text-neutral-medium mt-1">{activity.description}</p>
                                  {activity.dueDate && (
                                    <p className="text-xs text-neutral-medium mt-1">
                                      Due: {format(new Date(activity.dueDate), "MMM dd, yyyy")}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1 ml-3">
                                  <Badge variant="outline" className="text-xs">
                                    {activity.priority}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {activity.status}
                                  </Badge>
                                </div>
                              </div>
                              {activity.statusTags && activity.statusTags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {activity.statusTags.map((tag: string) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ethos" className="space-y-6">
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
                <Card key={ethos.id} className="border-2 border-ms-blue/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      {DAYS_OF_WEEK.find(d => d.value === ethos.dayOfWeek)?.label}
                      <Badge variant="secondary">{ethos.maxTaskSwitches} switches</Badge>
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
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}