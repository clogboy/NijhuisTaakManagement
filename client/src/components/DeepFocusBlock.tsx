import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Brain, Clock, Target, Focus, Star, CheckCircle, XCircle, Timer } from "lucide-react";
import { format, differenceInMinutes, differenceInSeconds } from "date-fns";
import type { Activity, DeepFocusBlock, Subtask } from "@shared/schema";

interface DeepFocusBlockProps {
  onActivateLowStimulus: () => void;
  onDeactivateLowStimulus: () => void;
}

export default function DeepFocusBlock({ onActivateLowStimulus, onDeactivateLowStimulus }: DeepFocusBlockProps) {
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<number | undefined>();
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<number | undefined>();
  const [productivityRating, setProductivityRating] = useState<number>(3);
  const [completionNotes, setCompletionNotes] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update current time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get active deep focus block
  const { data: activeBlock } = useQuery<DeepFocusBlock | null>({
    queryKey: ["/api/deep-focus/active"],
    refetchInterval: 5000, // Check every 5 seconds
  });

  // Get activities for task selection
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  // Get subtasks for urgent task selection
  const { data: subtasks = [] } = useQuery<Subtask[]>({
    queryKey: ["/api/subtasks"],
  });

  // Get today's scheduled focus blocks
  const { data: todayBlocks = [] } = useQuery<DeepFocusBlock[]>({
    queryKey: ["/api/deep-focus"],
    queryFn: async () => {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      
      const response = await apiRequest(`/api/deep-focus?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, "GET");
      return await response.json();
    },
  });

  // Start deep focus block
  const startFocusMutation = useMutation({
    mutationFn: async ({ blockId, activityId, subtaskId }: { blockId: number; activityId?: number; subtaskId?: number }) => {
      return apiRequest(`/api/deep-focus/${blockId}/start`, "POST", { 
        selectedActivityId: activityId,
        selectedSubtaskId: subtaskId 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deep-focus/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deep-focus"] });
      onActivateLowStimulus();
      setShowTaskSelector(false);
      toast({
        title: "Deep Focus gestart",
        description: "Je bent nu in deep focus modus. De omgeving is aangepast voor optimale concentratie.",
      });
    },
    onError: () => {
      toast({
        title: "Fout bij starten",
        description: "Kon deep focus sessie niet starten.",
        variant: "destructive",
      });
    },
  });

  // End deep focus block
  const endFocusMutation = useMutation({
    mutationFn: async ({ blockId, rating, notes }: { blockId: number; rating?: number; notes?: string }) => {
      return apiRequest("POST", `/api/deep-focus/${blockId}/end`, { 
        productivityRating: rating, 
        completionNotes: notes 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deep-focus/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deep-focus"] });
      onDeactivateLowStimulus();
      setShowCompletionDialog(false);
      setProductivityRating(3);
      setCompletionNotes("");
      toast({
        title: "Deep Focus voltooid",
        description: "Je sessie is beëindigd. Welkom terug!",
      });
    },
    onError: () => {
      toast({
        title: "Fout bij beëindigen",
        description: "Kon deep focus sessie niet beëindigen.",
        variant: "destructive",
      });
    },
  });

  // Create new focus block
  const createBlockMutation = useMutation({
    mutationFn: async (blockData: any) => {
      return apiRequest("POST", "/api/deep-focus", blockData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deep-focus"] });
      toast({
        title: "Focus blok aangemaakt",
        description: "Je nieuwe deep focus sessie is ingepland.",
      });
    },
    onError: () => {
      toast({
        title: "Fout bij aanmaken",
        description: "Kon focus blok niet aanmaken.",
        variant: "destructive",
      });
    },
  });

  const handleStartFocus = (block: DeepFocusBlock) => {
    const urgentSubtasks = subtasks.filter(s => s.status === 'pending');
    const availableActivities = activities.filter(a => a.status !== 'completed' && a.status !== 'archived');
    
    if (urgentSubtasks.length === 0 && availableActivities.length === 0) {
      // No tasks available, start without task selection
      startFocusMutation.mutate({ blockId: block.id });
    } else {
      // Show task selector with urgent subtasks and activities
      setShowTaskSelector(true);
    }
  };

  const handleEndFocus = () => {
    setShowCompletionDialog(true);
  };

  const handleQuickStart = () => {
    const now = new Date();
    const endTime = new Date(now.getTime() + 90 * 60000); // 90 minutes

    createBlockMutation.mutate({
      title: "Quick Deep Focus",
      scheduledStart: now,
      scheduledEnd: endTime,
      focusType: "deep",
      lowStimulusMode: true,
    });
  };

  const getUpcomingBlocks = () => {
    const now = new Date();
    return todayBlocks
      .filter(block => block.status === 'scheduled' && new Date(block.scheduledStart) > now)
      .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
  };

  const getActiveDuration = () => {
    if (!activeBlock?.actualStart) return 0;
    return differenceInMinutes(new Date(), new Date(activeBlock.actualStart));
  };

  const getRemainingTime = () => {
    if (!activeBlock?.scheduledEnd) return null;
    const endTime = new Date(activeBlock.scheduledEnd);
    const now = new Date();
    const totalSeconds = differenceInSeconds(endTime, now);
    
    if (totalSeconds <= 0) return null;
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSelectedTaskName = () => {
    if (activeBlock?.selectedActivityId) {
      const activity = activities.find(a => a.id === activeBlock.selectedActivityId);
      if (activity) return activity.title;
    }
    if ((activeBlock as any)?.selectedSubtaskId) {
      const subtask = subtasks.find(s => s.id === (activeBlock as any).selectedSubtaskId);
      if (subtask) return subtask.title;
    }
    return "Algemene focus sessie";
  };

  const getFocusRecommendations = () => {
    if (activeBlock) {
      return [
        "🔕 Schakel notificaties uit",
        "🎧 Gebruik noise-cancelling koptelefoon",
        "💧 Zorg voor voldoende hydratatie",
        "🌡️ Houd de temperatuur comfortabel",
        "📱 Leg je telefoon weg",
      ];
    }
    
    return [
      "🧘 Neem 2 minuten om je gedachten te ordenen",
      "☕ Zorg voor een warme drank binnen handbereik",
      "📝 Noteer eventuele afleiding zonder erop in te gaan",
      "🎯 Visualiseer het eindresultaat van je taak",
      "⏰ Stel een timer in voor je geplande sessie",
    ];
  };

  const upcomingBlocks = getUpcomingBlocks();
  const focusRecommendations = getFocusRecommendations();

  return (
    <div className="space-y-6">
      {/* Active Deep Focus Status */}
      {activeBlock && (
        <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Focus className="animate-pulse" size={20} />
              Deep Focus Actief
              {getRemainingTime() && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 flex items-center gap-1">
                  <Timer size={14} />
                  {getRemainingTime()}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-blue-900 dark:text-blue-100">{getSelectedTaskName()}</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Gestart om {format(new Date(activeBlock.actualStart!), "HH:mm")} • {getActiveDuration()} min actief
                </p>
                {getRemainingTime() && (
                  <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      🎯 Focus tijd resterend: <span className="font-mono font-bold">{getRemainingTime()}</span>
                    </p>
                  </div>
                )}
              </div>
              <Button 
                onClick={handleEndFocus}
                variant="outline"
                size="sm"
                className="border-blue-300 ml-4"
              >
                <CheckCircle size={16} className="mr-1" />
                Beëindigen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Scheduled Blocks */}
      {!activeBlock && upcomingBlocks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} />
              Geplande Focus Sessies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingBlocks.slice(0, 3).map((block) => (
              <div key={block.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium">{block.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(block.scheduledStart), "HH:mm")} - {format(new Date(block.scheduledEnd), "HH:mm")}
                  </p>
                </div>
                <Button 
                  onClick={() => handleStartFocus(block)}
                  size="sm"
                  disabled={startFocusMutation.isPending}
                >
                  <Target size={16} className="mr-1" />
                  Start Nu
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Start Option */}
      {!activeBlock && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain size={20} />
              Quick Deep Focus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Start direct een 90-minuten focus sessie voor diepe concentratie.
            </p>
            <Button 
              onClick={handleQuickStart}
              disabled={createBlockMutation.isPending}
              className="w-full"
            >
              <Focus size={16} className="mr-2" />
              Start Quick Focus (90 min)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Focus Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star size={20} />
            {activeBlock ? "Tips tijdens Focus" : "Focus Voorbereiding"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {focusRecommendations.map((tip, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <span className="text-base">{tip.split(' ')[0]}</span>
                <span>{tip.substring(tip.indexOf(' ') + 1)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Task Selection Dialog */}
      <Dialog open={showTaskSelector} onOpenChange={setShowTaskSelector}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecteer Focus Taak</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Urgent Subtasks Section */}
            {subtasks.filter(s => s.status === 'pending').length > 0 && (
              <div>
                <Label className="text-sm font-medium text-orange-700 mb-2 block">🔥 Urgente subtaken</Label>
                <div className="space-y-2">
                  {subtasks.filter(s => s.status === 'pending').map((subtask) => (
                    <div 
                      key={`subtask-${subtask.id}`}
                      onClick={() => {
                        setSelectedSubtaskId(subtask.id);
                        setSelectedActivityId(undefined);
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSubtaskId === subtask.id 
                          ? 'border-orange-500 bg-orange-50' 
                          : 'border-gray-200 hover:border-orange-300 hover:bg-orange-25'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-sm font-medium">{subtask.title}</span>
                      </div>
                      {subtask.description && (
                        <p className="text-xs text-gray-600 mt-1 ml-4">{subtask.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Activities Section */}
            {activities.filter(a => a.status !== 'completed' && a.status !== 'archived').length > 0 && (
              <div>
                <Label className="text-sm font-medium text-blue-700 mb-2 block">📋 Hoofdtaken</Label>
                <div className="space-y-2">
                  {activities.filter(a => a.status !== 'completed' && a.status !== 'archived').map((activity) => (
                    <div 
                      key={`activity-${activity.id}`}
                      onClick={() => {
                        setSelectedActivityId(activity.id);
                        setSelectedSubtaskId(undefined);
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedActivityId === activity.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.priority === 'urgent' ? 'bg-red-500' :
                          activity.priority === 'normal' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}></div>
                        <span className="text-sm font-medium">{activity.title}</span>
                      </div>
                      {activity.description && (
                        <p className="text-xs text-gray-600 mt-1 ml-4">{activity.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={() => {
                  const blockToStart = upcomingBlocks[0] || activeBlock;
                  if (blockToStart) {
                    startFocusMutation.mutate({ 
                      blockId: blockToStart.id, 
                      activityId: selectedActivityId,
                      subtaskId: selectedSubtaskId
                    });
                  }
                }}
                disabled={startFocusMutation.isPending || (!selectedActivityId && !selectedSubtaskId)}
                className="flex-1"
              >
                Start Deep Focus
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowTaskSelector(false);
                  setSelectedActivityId(undefined);
                  setSelectedSubtaskId(undefined);
                }}
                className="flex-1"
              >
                Annuleren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Completion Dialog */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Focus Sessie Evalueren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Hoe productief was deze sessie? (1-5 sterren)</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant={productivityRating >= rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => setProductivityRating(rating)}
                  >
                    <Star size={16} fill={productivityRating >= rating ? "currentColor" : "none"} />
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="completion-notes">Notities (optioneel)</Label>
              <Textarea
                id="completion-notes"
                placeholder="Wat ging goed? Wat kan beter?"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  if (activeBlock) {
                    endFocusMutation.mutate({ 
                      blockId: activeBlock.id, 
                      rating: productivityRating,
                      notes: completionNotes 
                    });
                  }
                }}
                disabled={endFocusMutation.isPending}
                className="flex-1"
              >
                <CheckCircle size={16} className="mr-2" />
                Voltooien
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCompletionDialog(false)}
                className="flex-1"
              >
                <XCircle size={16} className="mr-2" />
                Annuleren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}