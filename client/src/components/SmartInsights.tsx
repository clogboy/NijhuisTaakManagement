import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  Clock, 
  Zap, 
  Users, 
  Sunrise, 
  Sun, 
  Moon,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { Activity } from "@shared/schema";

interface SmartPriorityScore {
  score: number;
  factors: {
    urgency: number;
    importance: number;
    effort: number;
    context: number;
    collaboration: number;
  };
  reasoning: string;
  suggestedTimeSlot: 'morning' | 'afternoon' | 'evening' | 'flexible';
}

interface SmartActivity extends Activity {
  smartPriority: SmartPriorityScore;
}

interface SmartInsightsData {
  topPriority: SmartActivity[];
  quickWins: SmartActivity[];
  timeSlotSuggestions: {
    morning: SmartActivity[];
    afternoon: SmartActivity[];
    evening: SmartActivity[];
  };
}

interface SmartInsightsProps {
  onActivitySelect?: (activity: Activity) => void;
}

export default function SmartInsights({ onActivitySelect }: SmartInsightsProps) {
  const { data: insights, isLoading } = useQuery<SmartInsightsData>({
    queryKey: ["/api/smart-insights"],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="border-blue-100">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-500 animate-pulse" />
            <span className="text-sm text-gray-600">Analyseer taken...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return null;
  }

  const getTimeSlotIcon = (slot: string) => {
    switch (slot) {
      case 'morning': return <Sunrise className="h-4 w-4" />;
      case 'afternoon': return <Sun className="h-4 w-4" />;
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

  const getPriorityColor = (score: number) => {
    if (score >= 0.8) return 'bg-red-50 text-red-700 border-red-200';
    if (score >= 0.6) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (score >= 0.4) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-green-50 text-green-700 border-green-200';
  };

  const currentHour = new Date().getHours();
  const getCurrentTimeSlot = () => {
    if (currentHour >= 8 && currentHour < 12) return 'morning';
    if (currentHour >= 12 && currentHour < 17) return 'afternoon';
    if (currentHour >= 17 && currentHour < 20) return 'evening';
    return 'flexible';
  };

  const currentTimeSlot = getCurrentTimeSlot();
  const currentTimeSlotActivities = insights.timeSlotSuggestions[currentTimeSlot as keyof typeof insights.timeSlotSuggestions] || [];

  return (
    <div className="space-y-6">
      {/* Current Time Slot Recommendations */}
      {currentTimeSlotActivities.length > 0 && (
        <Card className="border-blue-100 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              {getTimeSlotIcon(currentTimeSlot)}
              <span>Nu optimaal: {getTimeSlotLabel(currentTimeSlot)}</span>
              <Badge variant="secondary" className="ml-auto">
                {currentTimeSlotActivities.length} taken
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentTimeSlotActivities.slice(0, 3).map((activity) => (
              <div 
                key={activity.id} 
                className="p-3 bg-white rounded-lg border border-blue-200 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => onActivitySelect?.(activity)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{activity.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{activity.smartPriority.reasoning}</p>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(activity.smartPriority.score)}>
                        {Math.round(activity.smartPriority.score * 100)}% prioriteit
                      </Badge>
                      {activity.estimatedDuration && (
                        <span className="text-xs text-gray-500">
                          ~{activity.estimatedDuration} min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Top Priority Tasks */}
      {insights.topPriority.length > 0 && (
        <Card className="border-orange-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <span>Hoogste prioriteit</span>
              <Badge variant="secondary" className="ml-auto">
                {insights.topPriority.length} taken
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.topPriority.slice(0, 3).map((activity) => (
              <div 
                key={activity.id} 
                className="p-3 bg-orange-50 rounded-lg border border-orange-200 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => onActivitySelect?.(activity)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{activity.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{activity.smartPriority.reasoning}</p>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(activity.smartPriority.score)}>
                        {Math.round(activity.smartPriority.score * 100)}% prioriteit
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getTimeSlotIcon(activity.smartPriority.suggestedTimeSlot)}
                        <span className="ml-1">{getTimeSlotLabel(activity.smartPriority.suggestedTimeSlot)}</span>
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Wins */}
      {insights.quickWins.length > 0 && (
        <Card className="border-green-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Zap className="h-5 w-5 text-green-500" />
              <span>Slimme quick wins</span>
              <Badge variant="secondary" className="ml-auto">
                {insights.quickWins.length} taken
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.quickWins.slice(0, 4).map((activity) => (
              <div 
                key={activity.id} 
                className="p-3 bg-green-50 rounded-lg border border-green-200 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => onActivitySelect?.(activity)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{activity.title}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        Quick win
                      </Badge>
                      {activity.estimatedDuration && (
                        <span className="text-xs text-gray-500">
                          ~{activity.estimatedDuration} min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Time Slot Planning */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Clock className="h-5 w-5 text-gray-500" />
            <span>Dag planning</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(insights.timeSlotSuggestions).map(([timeSlot, activities]) => (
              <div key={timeSlot} className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  {getTimeSlotIcon(timeSlot)}
                  <span>{getTimeSlotLabel(timeSlot)}</span>
                  <Badge variant="outline" className="text-xs">
                    {activities.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {activities.slice(0, 2).map((activity) => (
                    <div 
                      key={activity.id}
                      className="p-2 bg-gray-50 rounded border text-sm hover:shadow-sm transition-shadow cursor-pointer"
                      onClick={() => onActivitySelect?.(activity)}
                    >
                      <div className="font-medium text-gray-900 truncate">{activity.title}</div>
                      {activity.estimatedDuration && (
                        <div className="text-xs text-gray-500">~{activity.estimatedDuration} min</div>
                      )}
                    </div>
                  ))}
                  {activities.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{activities.length - 2} meer
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}