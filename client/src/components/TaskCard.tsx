import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Clock, ArrowRight, Zap, Construction, Target } from "lucide-react";

interface TaskCardProps {
  task: any;
  isCompleted: boolean;
  onToggleCompletion: (checked: boolean) => void;
  onTaskClick: () => void;
  onNavigate: () => void;
}

export default function TaskCard({ 
  task, 
  isCompleted, 
  onToggleCompletion, 
  onTaskClick, 
  onNavigate 
}: TaskCardProps) {
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700";
      case "medium": return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700";
      case "low": return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700";
      default: return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
      case "in-progress": case "in_progress": return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300";
      case "on-hold": return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300";
      case "pending": return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300";
      case "urgent": return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
      default: return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";
    }
  };

  const getTaskTypeIcon = (taskType?: string) => {
    switch (taskType) {
      case "quick_win": return <Zap className="h-3 w-3" />;
      case "roadblock": return <Construction className="h-3 w-3" />;
      default: return <Target className="h-3 w-3" />;
    }
  };

  return (
    <div
      className={`flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
        isCompleted ? 'opacity-75' : ''
      }`}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={onToggleCompletion}
        className="mt-1 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      />
      
      <div 
        className="flex-1 min-w-0 cursor-pointer"
        onClick={onTaskClick}
      >
        <div className="space-y-2">
          {/* Title and Priority Row */}
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm font-medium leading-tight ${
              isCompleted ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white'
            }`}>
              {task.title}
            </h4>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Badge
                variant="outline"
                className={`text-xs ${getPriorityColor(task.priority)}`}
              >
                {task.priority}
              </Badge>
              {task.urgencyScore && (
                <span className="text-xs text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  {task.urgencyScore}
                </span>
              )}
            </div>
          </div>
          
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-2">
            {task.isSubtask && (
              <div className="flex items-center text-blue-600 dark:text-blue-400">
                {getTaskTypeIcon(task.taskType)}
                <span className="text-xs ml-1">Subtask</span>
              </div>
            )}
            <Badge
              variant="secondary"
              className={`text-xs ${getStatusColor(task.status)}`}
            >
              {task.status}
            </Badge>
            {task.dueDate && (
              <div className="flex items-center text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3 mr-1" />
                <span className="text-xs">{format(new Date(task.dueDate), "MMM d")}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 flex-shrink-0 mt-1"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate();
        }}
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}