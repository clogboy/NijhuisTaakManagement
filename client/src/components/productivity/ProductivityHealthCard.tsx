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
  
  const getReflectionData = () => {
    // Focus on supportive observations without scoring or judgment
    const fallbackMessages = [
      { 
        message: "Elke stap voorwaarts telt, ook de kleine. Vooruitgang hoeft niet perfect te zijn om waardevol te zijn.",
        icon: "steps"
      },
      { 
        message: "Planning en nadenken over prioriteiten zijn productieve activiteiten op zich.",
        icon: "planning"
      },
      { 
        message: "Flexibiliteit en aanpassingsvermogen zijn belangrijke vaardigheden in een dynamische werkdag.",
        icon: "flexibility"
      },
      { 
        message: "Het is oké om je tempo aan te passen aan wat de dag vraagt.",
        icon: "pace"
      },
      { 
        message: "Verschillende dagen vragen om verschillende energieën en benaderingen.",
        icon: "energy"
      },
    ];
    
    // Prioritize observations based on what's most relevant
    if (stats.overdueCount > 0) {
      return {
        message: `Er zijn ${stats.overdueCount} verlopen taken. Een kleine tijdsinvestering nu voorkomt mogelijk stress later.`,
        icon: "clock"
      };
    } else if (stats.completedCount > 0) {
      return {
        message: "Je hebt al vooruitgang geboekt vandaag. Elke afgeronde taak draagt bij aan je doelen.",
        icon: "success"
      };
    } else if (stats.urgentCount > 0) {
      return {
        message: "Urgente zaken vragen focus en aandacht. Neem de tijd die je nodig hebt.",
        icon: "focus"
      };
    } else if (stats.dueThisWeek > 0) {
      return {
        message: `${stats.dueThisWeek} taken zijn deze week af te ronden. Een goede planning helpt bij het behalen van deadlines.`,
        icon: "calendar"
      };
    } else {
      // Return a random supportive message for quiet days
      return fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    }
  };

  const getReflectionIcon = (iconType: string) => {
    const iconMap: Record<string, JSX.Element> = {
      clock: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      success: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      focus: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      calendar: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      steps: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      planning: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      flexibility: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      pace: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      energy: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    };
    
    return iconMap[iconType] || iconMap.energy;
  };

  const reflectionData = getReflectionData();

  return (
    <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/40 dark:border-gray-700/40 rounded-lg p-3 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 rounded-lg flex items-center justify-center shadow-sm">
            <div className="text-blue-600 dark:text-blue-400">
              {getReflectionIcon(reflectionData.icon)}
            </div>
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
          {reflectionData.message}
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