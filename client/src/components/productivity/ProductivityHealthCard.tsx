import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Target, 
  Trophy, 
  AlertTriangle, 
  CheckCircle2,
  X,
  Settings,
  BarChart3,
  Zap
} from "lucide-react";

interface ProductivityStats {
  urgentCount: number;
  dueThisWeek: number;
  completedCount: number;
  activeContacts: number;
  overdueCount: number;
  roadblocksCount: number;
  quickWinsCount: number;
  subtasksCompleted: number;
  totalSubtasks: number;
}

interface ProductivityHealthProps {
  stats: ProductivityStats;
  onDismiss?: () => void;
  onDisable?: () => void;
  showSettings?: boolean;
}

export default function ProductivityHealthCard({ 
  stats, 
  onDismiss, 
  onDisable, 
  showSettings = false 
}: ProductivityHealthProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Calculate productivity metrics
  const completionRate = stats.totalSubtasks > 0 ? (stats.subtasksCompleted / stats.totalSubtasks) * 100 : 0;
  const workloadBalance = Math.max(0, 100 - (stats.urgentCount * 15 + stats.overdueCount * 25));
  const progressScore = Math.min(100, (stats.completedCount * 10) + (stats.quickWinsCount * 5));

  // Determine overall health score
  const healthScore = Math.round((completionRate + workloadBalance + progressScore) / 3);

  // Generate motivational message based on stats
  const getMotivationalMessage = () => {
    if (healthScore >= 80) {
      return {
        title: "Uitstekende productiviteit! 🚀",
        message: `Je bent echt op dreef! Met ${stats.completedCount} voltooide taken en ${stats.quickWinsCount} quick wins laat je zien hoe productief je bent. Blijf dit tempo vasthouden!`,
        mood: "excellent" as const
      };
    } else if (healthScore >= 60) {
      return {
        title: "Goede voortgang! 💪",
        message: `Je maakt goede voortgang met ${stats.completedCount} voltooide taken. ${stats.roadblocksCount > 0 ? `Er zijn nog ${stats.roadblocksCount} wegversperringen om aan te pakken, maar je bent op de goede weg!` : "Je hebt geen wegversperringen, dat is geweldig!"}`,
        mood: "good" as const
      };
    } else if (healthScore >= 40) {
      return {
        title: "Je kunt dit! 🎯",
        message: `Elke stap telt! Je hebt al ${stats.completedCount} taken voltooid. ${stats.urgentCount > 0 ? `Focus eerst op de ${stats.urgentCount} urgente taken.` : "Pak vandaag een paar quick wins aan voor extra momentum."}`,
        mood: "encouraging" as const
      };
    } else {
      return {
        title: "Nieuwe start, nieuwe kansen! ⭐",
        message: `Vandaag is een nieuwe dag om vooruitgang te boeken. Begin klein: ${stats.quickWinsCount > 0 ? `Je hebt ${stats.quickWinsCount} quick wins klaarstaan!` : "Voeg een paar quick wins toe om momentum op te bouwen."}`,
        mood: "supportive" as const
      };
    }
  };

  const motivationalData = getMotivationalMessage();

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case "excellent": return "border-green-500 bg-green-50 dark:bg-green-900/20";
      case "good": return "border-blue-500 bg-blue-50 dark:bg-blue-900/20";
      case "encouraging": return "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20";
      case "supportive": return "border-purple-500 bg-purple-50 dark:bg-purple-900/20";
      default: return "border-gray-300 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case "excellent": return <Trophy className="h-5 w-5 text-green-600" />;
      case "good": return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case "encouraging": return <Target className="h-5 w-5 text-yellow-600" />;
      case "supportive": return <Zap className="h-5 w-5 text-purple-600" />;
      default: return <BarChart3 className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <Card className={`border-2 ${getMoodColor(motivationalData.mood)} micro-fadeIn`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {getMoodIcon(motivationalData.mood)}
            Productiviteit Check
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {healthScore}% gezond
            </Badge>
            {showSettings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDisable}
                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Uitschakelen"
              >
                <Settings className="h-3 w-3" />
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium text-base mb-2">{motivationalData.title}</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">{motivationalData.message}</p>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Productiviteit Score</span>
              <span>{healthScore}%</span>
            </div>
            <Progress value={healthScore} className="h-2" />
          </div>

          {showDetails && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    Voltooid
                  </span>
                  <span className="font-medium">{stats.completedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3 w-3 text-yellow-600" />
                    Quick Wins
                  </span>
                  <span className="font-medium">{stats.quickWinsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-blue-600" />
                    Subtaken
                  </span>
                  <span className="font-medium">{stats.subtasksCompleted}/{stats.totalSubtasks}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-red-600" />
                    Urgent
                  </span>
                  <span className="font-medium">{stats.urgentCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-orange-600" />
                    Wegversperringen
                  </span>
                  <span className="font-medium">{stats.roadblocksCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-gray-600" />
                    Achterstallig
                  </span>
                  <span className="font-medium">{stats.overdueCount}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-xs"
        >
          {showDetails ? "Minder details" : "Meer details"}
        </Button>
      </CardContent>
    </Card>
  );
}