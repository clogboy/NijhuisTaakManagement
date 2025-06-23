import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Brain, 
  Calendar, 
  Clock, 
  Target, 
  Zap, 
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Focus,
  Lightbulb,
  RefreshCw,
  User,
  Users,
  Activity as ActivityIcon,
  Plus
} from "lucide-react";
import { Activity } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

export default function Agenda() {
  const { t } = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [maxTaskSwitches, setMaxTaskSwitches] = useState(3);
  const [lastTriggerTime, setLastTriggerTime] = useState<number | null>(null);
  const [isDeepFocusModalOpen, setIsDeepFocusModalOpen] = useState(false);

  const [focusStartTime, setFocusStartTime] = useState('');
  const [focusEndTime, setFocusEndTime] = useState('');
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);

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
    mutationFn: ({ date, maxTaskSwitches }: { date: string; maxTaskSwitches: number }) =>
      apiRequest("/api/generate-agenda", "POST", { date, maxTaskSwitches }),
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

  const [agendaSuggestion, setAgendaSuggestion] = useState<AgendaSuggestion | null>(null);

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

  // Cooldown logic for scheduler trigger
  const isOnCooldown = lastTriggerTime && (Date.now() - lastTriggerTime) < 30 * 60 * 1000; // 30 minutes
  const cooldownMinutesLeft = isOnCooldown ? Math.ceil((30 * 60 * 1000 - (Date.now() - lastTriggerTime!)) / (60 * 1000)) : 0;

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
              <TabsTrigger value="today" className="text-xs sm:text-sm">Mijn Agenda</TabsTrigger>
              <TabsTrigger value="flow" className="text-xs sm:text-sm">Flow Strategie</TabsTrigger>
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
                  <div className="space-y-2">
                    <Button
                      onClick={handleGenerateAgenda}
                      disabled={generateAgendaMutation.isPending}
                      className="w-full bg-ms-blue hover:bg-ms-blue-dark text-white"
                    >
                      <Brain size={16} className="mr-2" />
                      {generateAgendaMutation.isPending ? t("common.loading") : t("agenda.generateAgenda")}
                    </Button>
                    <Button
                      onClick={() => setIsDeepFocusModalOpen(true)}
                      variant="outline"
                      className="w-full"
                    >
                      <Focus size={16} className="mr-2" />
                      Schedule Deep Focus
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
              </CardContent>
            </Card>

            {/* AI Suggestions */}
            {agendaSuggestion && (
              <Card className="border-2 border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <Lightbulb size={20} />
                    AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-medium text-green-900 mb-2">Daily Focus Strategy</h4>
                    <p className="text-sm text-green-800">{agendaSuggestion.suggestions || "No suggestions available"}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-green-900 mb-2">Task Switch Optimization</h4>
                    <p className="text-sm text-green-800">{agendaSuggestion.taskSwitchOptimization || "No optimization suggestions available"}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        Estimated switches: {agendaSuggestion.estimatedTaskSwitches || 0}
                      </Badge>
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        Scheduled: {agendaSuggestion.scheduledActivities?.length || 0} activities
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Priority Matrix */}
            {priorityMatrix && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target size={20} />
                    Eisenhower Priority Matrix
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(priorityMatrix).map(([quadrant, activities]) => (
                      <Card key={quadrant} className={`border-2 ${getQuadrantColor(quadrant)}`}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {getQuadrantIcon(quadrant)}
                            <span className="text-sm">{getQuadrantTitle(quadrant)}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {!activities || activities.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No activities in this quadrant</p>
                          ) : (
                            <div className="space-y-2">
                              {activities.slice(0, 3).map((activity) => (
                                <div key={activity?.id || Math.random()} className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-current opacity-60"></div>
                                  <span className="text-sm font-medium">{activity?.title || "Untitled activity"}</span>
                                </div>
                              ))}
                              {activities.length > 3 && (
                                <p className="text-xs text-gray-500">
                                  +{activities.length - 3} more activities
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

            <TabsContent value="flow" className="space-y-4 md:space-y-6">
            {/* Current Strategy Display */}
            {currentStrategy && (
              <Card className="border-2 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                    <Brain size={20} />
                    Actieve Flow Strategie
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">{currentStrategy.strategyName}</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Type: {currentStrategy.personalityType}</p>
                    </div>
                    <Badge variant="default" className="bg-blue-600">Actief</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Personality-Based Flow Strategies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User size={20} />
                  Persoonlijkheid-Gebaseerde Flow Strategieën
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Kies een cognitieve strategie geoptimaliseerd voor jouw werkpatronen en energieniveaus. Elke strategie is gebaseerd op chronobiologie onderzoek en productiviteitswetenschap.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {personalityPresets?.map((preset) => {
                    const isActive = currentStrategy?.personalityType === preset.personalityType;
                    
                    const getPersonalityIcon = (type: string) => {
                      switch (type) {
                        case "early_bird": return <Clock className="text-yellow-600" size={20} />;
                        case "night_owl": return <Brain className="text-purple-600" size={20} />;
                        case "steady_pacer": return <Target className="text-green-600" size={20} />;
                        case "sprint_recover": return <Zap className="text-orange-600" size={20} />;
                        case "collaborative": return <Users className="text-blue-600" size={20} />;
                        case "adaptive": return <ActivityIcon className="text-gray-600" size={20} />;
                        default: return <User size={20} />;
                      }
                    };

                    const getPersonalityColor = (type: string) => {
                      switch (type) {
                        case "early_bird": return "border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800";
                        case "night_owl": return "border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800";
                        case "steady_pacer": return "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800";
                        case "sprint_recover": return "border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800";
                        case "collaborative": return "border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800";
                        case "adaptive": return "border-gray-200 bg-gray-50 dark:bg-gray-950 dark:border-gray-800";
                        default: return "border-gray-200 bg-gray-50 dark:bg-gray-950 dark:border-gray-800";
                      }
                    };

                    return (
                      <Card 
                        key={preset.personalityType} 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          isActive 
                            ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-950' 
                            : `border-2 ${getPersonalityColor(preset.personalityType)}`
                        }`}
                        onClick={() => !isActive && applyPresetMutation.mutate(preset.personalityType)}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getPersonalityIcon(preset.personalityType)}
                              <span className="text-sm">{preset.strategyName}</span>
                            </div>
                            {isActive && (
                              <Badge variant="default" className="bg-blue-600 text-xs">Actief</Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{preset.description}</p>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-400">Werkuren:</span>
                                <span className="font-medium">{preset.workingHours.start} - {preset.workingHours.end}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-400">Piek Focus:</span>
                                <span className="font-medium">{preset.workingHours.peakStart} - {preset.workingHours.peakEnd}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-400">Max Taak Switches:</span>
                                <span className="font-medium">{preset.maxTaskSwitches}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-400">Focus Blok:</span>
                                <span className="font-medium">{preset.focusBlockDuration}min</span>
                              </div>
                            </div>

                            {preset.preferredTaskTypes && preset.preferredTaskTypes.length > 0 && (
                              <div>
                                <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Geoptimaliseerd Voor:</h5>
                                <div className="flex flex-wrap gap-1">
                                  {preset.preferredTaskTypes.slice(0, 3).map((type: string) => (
                                    <Badge key={type} variant="outline" className="text-xs">
                                      {type}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {!isActive && (
                              <Button 
                                size="sm" 
                                className="w-full mt-3"
                                disabled={applyPresetMutation.isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  applyPresetMutation.mutate(preset.personalityType);
                                }}
                              >
                                {applyPresetMutation.isPending ? "Toepassen..." : "Strategie Toepassen"}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      {/* Deep Focus Scheduling Modal */}
      <Dialog open={isDeepFocusModalOpen} onOpenChange={(open) => {
        setIsDeepFocusModalOpen(open);
        if (!open) {
          setFocusStartTime('');
          setFocusEndTime('');
          setSelectedWeekdays([]);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Focus size={20} />
              Deep Focus Plannen
            </DialogTitle>
            <DialogDescription>
              Plan gefocuste werktijd voor maximale productiviteit.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Weekdagen:
              </label>
              <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                  const dayValue = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][index];
                  return (
                    <div key={day} className="flex flex-col items-center">
                      <label className="text-xs text-gray-600 mb-1">{day}</label>
                      <input
                        type="checkbox"
                        checked={selectedWeekdays.includes(dayValue)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedWeekdays([...selectedWeekdays, dayValue]);
                          } else {
                            setSelectedWeekdays(selectedWeekdays.filter(d => d !== dayValue));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Starttijd:
                </label>
                <Input
                  type="time"
                  value={focusStartTime}
                  onChange={(e) => setFocusStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Eindtijd:
                </label>
                <Input
                  type="time"
                  value={focusEndTime}
                  onChange={(e) => setFocusEndTime(e.target.value)}
                />
              </div>
            </div>

            {selectedWeekdays.length > 0 && focusStartTime && focusEndTime && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-sm text-blue-900 mb-2">Geplande Sessie:</h4>
                <p className="text-xs text-blue-800">
                  <strong>Deep Focus Tijdblok</strong><br/>
                  {focusStartTime} - {focusEndTime}<br/>
                  op {selectedWeekdays.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ')}
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  Je selecteert een taak wanneer de sessie begint.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDeepFocusModalOpen(false)}
                className="flex-1"
              >
                Annuleren
              </Button>
              <Button
                onClick={() => {
                  if (selectedWeekdays.length > 0 && focusStartTime && focusEndTime) {
                    // Here you would normally save to database
                    toast({
                      title: "Deep Focus Gepland",
                      description: `Tijdblokken gepland van ${focusStartTime} tot ${focusEndTime} op ${selectedWeekdays.join(', ')}`,
                    });
                    setIsDeepFocusModalOpen(false);
                    setFocusStartTime('');
                    setFocusEndTime('');
                    setSelectedWeekdays([]);
                  }
                }}
                disabled={selectedWeekdays.length === 0 || !focusStartTime || !focusEndTime}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Tijdblokken Plannen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}