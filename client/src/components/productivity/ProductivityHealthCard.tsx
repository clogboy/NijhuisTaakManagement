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
    // Focus on supportive observations without scoring or judgment
    const messages = [
      "Elke stap voorwaarts telt, ook de kleine. Vooruitgang hoeft niet perfect te zijn om waardevol te zijn.",
      "Planning en nadenken over prioriteiten zijn productieve activiteiten op zich.",
      "Flexibiliteit en aanpassingsvermogen zijn belangrijke vaardigheden in een dynamische werkdag.",
      "Het is oké om je tempo aan te passen aan wat de dag vraagt.",
      "Verschillende dagen vragen om verschillende energieën en benaderingen.",
    ];
    
    // Prioritize observations based on what's most relevant
    if (stats.overdueCount > 0) {
      return `Er zijn ${stats.overdueCount} verlopen taken. Een kleine tijdsinvestering nu voorkomt mogelijk stress later.`;
    } else if (stats.completedCount > 0) {
      return "Je hebt al vooruitgang geboekt vandaag. Elke afgeronde taak draagt bij aan je doelen.";
    } else if (stats.urgentCount > 0) {
      return "Urgente zaken vragen focus en aandacht. Neem de tijd die je nodig hebt.";
    } else if (stats.dueThisWeek > 0) {
      return `${stats.dueThisWeek} taken zijn deze week af te ronden. Een goede planning helpt bij het behalen van deadlines.`;
    } else {
      // Return a random supportive message for quiet days
      return messages[Math.floor(Math.random() * messages.length)];
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
          {stats.urgentCount > 0 && (
            <>
              <span>•</span>
              <span className="text-orange-600 dark:text-orange-400">{stats.urgentCount} urgent</span>
            </>
          )}
          {stats.overdueCount > 0 && (
            <>
              <span>•</span>
              <span className="text-red-600 dark:text-red-400">{stats.overdueCount} verlopen</span>
            </>
          )}
          {stats.dueThisWeek > 0 && (
            <>
              <span>•</span>
              <span className="text-blue-600 dark:text-blue-400">{stats.dueThisWeek} deze week</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}