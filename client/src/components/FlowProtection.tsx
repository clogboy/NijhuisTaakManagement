import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, 
  Brain, 
  Clock, 
  Zap, 
  Users, 
  Target,
  Settings,
  Sunrise,
  Moon,
  Activity,
  Gauge
} from "lucide-react";
import { Activity as ActivityType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FlowRecommendation {
  shouldFocus: boolean;
  suggestedTaskTypes: string[];
  allowInterruptions: boolean;
  energyLevel: number;
  timeSlotType: 'peak' | 'productive' | 'low-energy';
  recommendation: string;
}

interface PersonalityPreset {
  personalityType: string;
  strategyName: string;
  description: string;
  workingHours: {
    start: string;
    end: string;
    peakStart: string;
    peakEnd: string;
  };
  maxTaskSwitches: number;
  focusBlockDuration: number;
  breakDuration: number;
  preferredTaskTypes: string[];
  energyPattern: {
    morning: number;
    afternoon: number;
    evening: number;
  };
  notificationSettings: {
    allowInterruptions: boolean;
    urgentOnly: boolean;
    quietHours: { start: string; end: string };
  };
}

interface FlowProtectionProps {
  onActivitySelect?: (activity: ActivityType) => void;
  lowStimulusMode?: boolean;
  onLowStimulusModeChange?: (enabled: boolean) => void;
}

const PERSONALITY_ICONS = {
  early_bird: Sunrise,
  night_owl: Moon,
  steady_pacer: Activity,
  sprint_recover: Zap,
  collaborative: Users,
  adaptive: Brain
};

const ENERGY_COLORS = {
  peak: "bg-green-100 text-green-800 border-green-200",
  productive: "bg-blue-100 text-blue-800 border-blue-200",
  "low-energy": "bg-orange-100 text-orange-800 border-orange-200"
};

export default function FlowProtection({ 
  onActivitySelect, 
  lowStimulusMode = false, 
  onLowStimulusModeChange 
}: FlowProtectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  // Get available personality presets
  const { data: personalityPresets } = useQuery<PersonalityPreset[]>({
    queryKey: ["/api/flow/personality-presets"],
  });

  // Get current flow strategy
  const { data: currentStrategy } = useQuery<any>({
    queryKey: ["/api/flow/current-strategy"],
  });

  // Get current flow recommendations
  const { data: flowRecommendations } = useQuery<FlowRecommendation>({
    queryKey: ["/api/flow/recommendations"],
    refetchInterval: 300000, // Update every 5 minutes
  });

  // Get optimized time slot activities
  const { data: smartInsights } = useQuery<any>({
    queryKey: ["/api/smart-insights"],
  });

  const timeSlotActivities = smartInsights?.timeSlotSuggestions || { morning: [], afternoon: [], evening: [] };

  const applyPresetMutation = useMutation({
    mutationFn: (presetType: string) => 
      apiRequest("/api/flow/apply-preset", "POST", { personalityType: presetType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flow/current-strategy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/flow/recommendations"] });
      toast({
        title: "Flow Strategy Applied",
        description: "Your personalized flow protection is now active",
      });
    },
  });

  const toggleLowStimulusMutation = useMutation({
    mutationFn: (enabled: boolean) => 
      apiRequest("/api/flow/low-stimulus", "POST", { enabled }),
    onSuccess: (_, enabled) => {
      onLowStimulusModeChange?.(enabled);
      queryClient.invalidateQueries({ queryKey: ["/api/flow/recommendations"] });
      toast({
        title: enabled ? "Low Stimulus Mode Activated" : "Low Stimulus Mode Deactivated",
        description: enabled 
          ? "Reduced notifications and simplified interface active"
          : "Normal interface and notifications restored",
      });
    },
  });

  const getCurrentTimeSlot = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 20) return 'evening';
    return 'flexible';
  };

  const getTimeSlotIcon = (slot: string) => {
    switch (slot) {
      case 'morning': return <Sunrise className="h-4 w-4" />;
      case 'afternoon': return <Activity className="h-4 w-4" />;
      case 'evening': return <Moon className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTimeSlotLabel = (slot: string) => {
    switch (slot) {
      case 'morning': return 'Ochtend';
      case 'afternoon': return 'Middag';
      case 'evening': return 'Avond';
      default: return 'Flexibel';
    }
  };

  const currentTimeSlot = getCurrentTimeSlot();
  const currentActivities = timeSlotActivities?.[currentTimeSlot as keyof typeof timeSlotActivities] || [];

  return (
    <div className="space-y-6">
      {/* Current Flow Status */}
      {flowRecommendations && (
        <Card className="border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span>Flow Protection Status</span>
              <Badge className={ENERGY_COLORS[flowRecommendations.timeSlotType]}>
                {Math.round(flowRecommendations.energyLevel * 100)}% Energy
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-700">{flowRecommendations.recommendation}</p>
              
              <div className="flex flex-wrap gap-2">
                {flowRecommendations.suggestedTaskTypes.map(type => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {type.replace('_', ' ')}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span>Focus Mode: {flowRecommendations.shouldFocus ? "Active" : "Flexible"}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>Interruptions: {flowRecommendations.allowInterruptions ? "Allowed" : "Blocked"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}



      {/* Personality-Based Presets */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <span>Flow Strategy Presets</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedPreset} onValueChange={setSelectedPreset}>
            <SelectTrigger>
              <SelectValue placeholder="Choose your work personality type..." />
            </SelectTrigger>
            <SelectContent>
              {personalityPresets?.map((preset) => {
                const Icon = PERSONALITY_ICONS[preset.personalityType as keyof typeof PERSONALITY_ICONS];
                return (
                  <SelectItem key={preset.personalityType} value={preset.personalityType}>
                    <div className="flex items-center space-x-2">
                      <Icon className="h-4 w-4" />
                      <span>{preset.strategyName}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {selectedPreset && (
            <div className="space-y-3">
              {personalityPresets?.map((preset) => {
                if (preset.personalityType !== selectedPreset) return null;
                
                return (
                  <div key={preset.personalityType} className="p-3 bg-gray-50 rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-2">{preset.strategyName}</h4>
                    <p className="text-sm text-gray-600 mb-3">{preset.description}</p>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-3">
                      <div>Work Hours: {preset.workingHours.start} - {preset.workingHours.end}</div>
                      <div>Peak: {preset.workingHours.peakStart} - {preset.workingHours.peakEnd}</div>
                      <div>Max Switches: {preset.maxTaskSwitches}</div>
                      <div>Focus Blocks: {preset.focusBlockDuration}min</div>
                    </div>

                    <div className="flex space-x-2 mb-3">
                      <Badge variant="outline" className="text-xs">
                        Morning: {Math.round(preset.energyPattern.morning * 100)}%
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Afternoon: {Math.round(preset.energyPattern.afternoon * 100)}%
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Evening: {Math.round(preset.energyPattern.evening * 100)}%
                      </Badge>
                    </div>

                    <Button
                      onClick={() => applyPresetMutation.mutate(preset.personalityType)}
                      disabled={applyPresetMutation.isPending}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {applyPresetMutation.isPending ? "Applying..." : "Apply This Strategy"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimized Time Slot Activities */}
      {currentActivities.length > 0 && (
        <Card className="border-green-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              {getTimeSlotIcon(currentTimeSlot)}
              <span>Optimaal nu: {getTimeSlotLabel(currentTimeSlot)}</span>
              <Badge variant="secondary" className="ml-auto">
                {currentActivities.length} taken
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentActivities.slice(0, 3).map((activity) => (
              <div 
                key={activity.id} 
                className="p-3 bg-green-50 rounded-lg border border-green-200 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => onActivitySelect?.(activity)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{activity.title}</h4>
                    {activity.estimatedDuration && (
                      <span className="text-xs text-gray-500">
                        ~{activity.estimatedDuration} min
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}