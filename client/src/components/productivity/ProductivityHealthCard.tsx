import { X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  
  const getReflectionMessage = () => {
    const completionRate = stats.totalSubtasks > 0 ? (stats.subtasksCompleted / stats.totalSubtasks) * 100 : 0;
    const workload = stats.urgentCount + stats.overdueCount + stats.roadblocksCount;
    
    if (stats.completedCount >= 3 && completionRate > 70) {
      return "Je hebt vandaag goed gefocust. De voortgang op je taken toont aan dat je prioriteiten helder zijn.";
    } else if (stats.urgentCount > 2) {
      return "Er zijn meerdere urgente zaken. Overweeg om één prioriteit te kiezen en daar volledig op te focussen.";
    } else if (stats.overdueCount > 0) {
      return "Sommige taken lopen achter. Een kleine tijdsinvestering nu voorkomt mogelijk stress later.";
    } else if (stats.activeContacts > 3) {
      return "Je hebt veel actieve samenwerkingen. Dat toont je betrokkenheid bij verschillende projecten.";
    } else if (workload === 0 && stats.completedCount === 0) {
      return "Een rustige dag biedt ruimte voor planning en reflectie op langetermijndoelen.";
    } else {
      return "Je werkdag verloopt evenwichtig. Blijf de balans bewaken tussen nieuwe taken en lopende projecten.";
    }
  };

  return (
    <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/40 dark:border-gray-700/40 rounded-lg p-3 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
            <span className="text-xs">💭</span>
          </div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Dagelijkse reflectie</span>
        </div>
        <div className="flex items-center gap-1">
          {showSettings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDisable}
              className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 opacity-50 hover:opacity-100"
              title="Uitschakelen"
            >
              <Settings className="h-2.5 w-2.5" />
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 opacity-50 hover:opacity-100"
              title="Verbergen"
            >
              <X className="h-2.5 w-2.5" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          {getReflectionMessage()}
        </p>
        
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200/30 dark:border-gray-700/30">
          <span>{stats.completedCount} voltooid</span>
          <span>•</span>
          <span>{stats.activeContacts} contacten</span>
          {stats.urgentCount > 0 && (
            <>
              <span>•</span>
              <span className="text-orange-600 dark:text-orange-400">{stats.urgentCount} urgent</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}