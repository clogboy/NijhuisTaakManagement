import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  Clock, 
  Target, 
  Play, 
  Pause, 
  Square,
  CheckCircle,
  Focus,
  Timer
} from "lucide-react";
import { Activity } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DeepFocusSession {
  id: string;
  taskId: number;
  duration: number;
  startTime: Date;
  isActive: boolean;
}

interface DeepFocusModeProps {
  onLowStimulusModeChange?: (enabled: boolean) => void;
  isLowStimulusMode?: boolean;
}

export default function DeepFocusMode({ 
  onLowStimulusModeChange, 
  isLowStimulusMode = false 
}: DeepFocusModeProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentSession, setCurrentSession] = useState<DeepFocusSession | null>(null);
  const [selectedTask, setSelectedTask] = useState<Activity | null>(null);
  const [sessionDuration, setSessionDuration] = useState(25);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const { data: activities } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentSession?.isActive && timeRemaining > 0 && !isPaused) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [currentSession, timeRemaining, isPaused]);

  const startFocusSession = useMutation({
    mutationFn: async (data: { taskId: number; duration: number }) => {
      const response = await apiRequest("/api/deep-focus/start", "POST", data);
      return response.json();
    },
    onSuccess: (session: DeepFocusSession) => {
      setCurrentSession(session);
      setTimeRemaining(session.duration * 60);
      onLowStimulusModeChange?.(true);
      toast({
        title: "Focus Gestart",
        description: `Focus sessie van ${session.duration} minuten is begonnen`,
      });
    },
  });

  const endFocusSession = useMutation({
    mutationFn: async () => {
      if (!currentSession) return;
      await apiRequest(`/api/deep-focus/end/${currentSession.id}`, "POST");
    },
    onSuccess: () => {
      setCurrentSession(null);
      setSelectedTask(null);
      setTimeRemaining(0);
      onLowStimulusModeChange?.(false);
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Focus Voltooid",
        description: "Goed werk! Je focus sessie is afgerond.",
      });
    },
  });

  const handleStartSession = () => {
    if (!selectedTask) {
      toast({
        title: "Selecteer een Taak",
        description: "Kies een taak om op te focussen",
        variant: "destructive",
      });
      return;
    }

    startFocusSession.mutate({
      taskId: selectedTask.id,
      duration: sessionDuration,
    });
  };

  const handleSessionComplete = () => {
    endFocusSession.mutate();
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecommendedTasks = () => {
    return activities?.filter(activity => 
      activity.status === 'pending' && 
      activity.estimatedDuration && 
      activity.estimatedDuration >= 20 &&
      (activity.priority === 'high' ||
       activity.description?.toLowerCase().includes('focus') ||
       activity.description?.toLowerCase().includes('analysis') ||
       activity.description?.toLowerCase().includes('ontwerp'))
    ).slice(0, 5) || [];
  };

  // Active session view
  if (currentSession?.isActive) {
    return (
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-blue-800">
            <Focus className="h-5 w-5" />
            <span>Actieve Focus</span>
            <Badge className="bg-blue-600 text-white">
              {isPaused ? "Gepauzeerd" : "Actief"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedTask && (
            <div className="p-3 bg-white rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-1">{selectedTask.title}</h4>
              <p className="text-sm text-blue-700">{selectedTask.description}</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">Resterende Tijd</span>
              <span className="text-xl font-bold text-blue-900">{formatTime(timeRemaining)}</span>
            </div>
            <Progress 
              value={((sessionDuration * 60 - timeRemaining) / (sessionDuration * 60)) * 100}
              className="h-2"
            />
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={togglePause}
              className="flex-1"
            >
              {isPaused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
              {isPaused ? "Hervatten" : "Pauzeren"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => endFocusSession.mutate()}
              className="flex-1"
            >
              <Square className="h-4 w-4 mr-1" />
              Stoppen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Setup screen
  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-purple-600" />
          <span>Diepgaande Focus</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Duration Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Focus Duur
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[15, 25, 45, 60].map(duration => (
              <Button
                key={duration}
                variant={sessionDuration === duration ? "default" : "outline"}
                size="sm"
                onClick={() => setSessionDuration(duration)}
                className="flex items-center justify-center"
              >
                <Timer className="h-4 w-4 mr-1" />
                {duration}m
              </Button>
            ))}
          </div>
        </div>

        {/* Task Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecteer Focus Taak
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {getRecommendedTasks().map((task: Activity) => (
              <div
                key={task.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedTask?.id === task.id
                    ? "border-purple-300 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>
                    <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      {task.priority && (
                        <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                          {task.priority === 'high' ? 'Hoog' : task.priority === 'medium' ? 'Gemiddeld' : 'Laag'}
                        </Badge>
                      )}
                      {task.estimatedDuration && (
                        <span className="text-xs text-gray-500">
                          ~{task.estimatedDuration} min
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedTask?.id === task.id && (
                    <CheckCircle className="h-5 w-5 text-purple-600 ml-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {getRecommendedTasks().length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Geen geschikte taken gevonden. Maak taken aan met een geschatte duur van 20+ minuten.
            </p>
          )}
        </div>

        <Button
          onClick={handleStartSession}
          disabled={!selectedTask || startFocusSession.isPending}
          className="w-full"
          size="lg"
        >
          <Target className="h-4 w-4 mr-2" />
          {startFocusSession.isPending ? "Starten..." : "Start Focus Sessie"}
        </Button>
      </CardContent>
    </Card>
  );
}