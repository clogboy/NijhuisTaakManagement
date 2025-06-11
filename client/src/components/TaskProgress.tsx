import React, { useState, useEffect } from 'react'
import { AnimatedProgress } from '@/components/ui/animated-progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle, Clock, Target, Zap, Construction, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskProgressProps {
  taskId: number
  title: string
  status: string
  taskType?: string
  isCompleted?: boolean
  progress?: number
  onToggleComplete?: (taskId: number, completed: boolean) => void
  onNavigate?: () => void
  showProgress?: boolean
  animated?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function TaskProgress({
  taskId,
  title,
  status,
  taskType,
  isCompleted = false,
  progress,
  onToggleComplete,
  onNavigate,
  showProgress = true,
  animated = true,
  size = "md",
  className
}: TaskProgressProps) {
  const [currentProgress, setCurrentProgress] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Calculate progress based on status if not provided
  const calculatedProgress = progress ?? (() => {
    switch (status) {
      case "completed": return 100
      case "in-progress": case "in_progress": return 65
      case "on-hold": return 30
      case "pending": return 0
      case "urgent": return 80
      default: return 0
    }
  })()

  useEffect(() => {
    if (animated) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setCurrentProgress(calculatedProgress)
        setIsAnimating(false)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setCurrentProgress(calculatedProgress)
    }
  }, [calculatedProgress, animated])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "success"
      case "in-progress": case "in_progress": return "default"
      case "on-hold": return "warning"
      case "pending": return "warning"
      case "urgent": return "error"
      default: return "default"
    }
  }

  const getTaskTypeIcon = (taskType?: string) => {
    switch (taskType) {
      case "quick_win": return <Zap className="h-4 w-4 text-yellow-500" />
      case "roadblock": return <Construction className="h-4 w-4 text-red-500" />
      default: return <Target className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusIcon = () => {
    if (isCompleted || status === "completed") {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }
    if (status === "in-progress" || status === "in_progress") {
      return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
    }
    return <Circle className="h-5 w-5 text-gray-400" />
  }

  const handleToggleComplete = () => {
    if (onToggleComplete) {
      setIsAnimating(true)
      onToggleComplete(taskId, !isCompleted)
    }
  }

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-lg border bg-white dark:bg-gray-800 p-4 transition-all duration-300 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600",
      isCompleted && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
      className
    )}>
      {/* Background animation for completion */}
      {isAnimating && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 opacity-50 animate-pulse" />
      )}

      <div className="relative flex items-start justify-between">
        <div className="flex-1 space-y-3">
          {/* Header with status icon and title */}
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
              onClick={handleToggleComplete}
              disabled={!onToggleComplete}
            >
              {getStatusIcon()}
            </Button>
            
            <div className="flex-1">
              <h4 className={cn(
                "font-medium transition-all duration-300",
                isCompleted ? "line-through text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"
              )}>
                {title}
              </h4>
              
              <div className="flex items-center gap-2 mt-1">
                {taskType && (
                  <div className="flex items-center gap-1">
                    {getTaskTypeIcon(taskType)}
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {taskType.replace('_', ' ')}
                    </span>
                  </div>
                )}
                
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs transition-colors duration-300",
                    status === "completed" && "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
                    (status === "in-progress" || status === "in_progress") && "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
                    status === "on-hold" && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
                    status === "pending" && "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
                    status === "urgent" && "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                  )}
                >
                  {status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {showProgress && (
            <AnimatedProgress
              value={currentProgress}
              variant={getStatusColor(status)}
              size={size}
              animated={animated}
              showPercentage={size !== "sm"}
              showIcon={false}
              className="w-full"
            />
          )}
        </div>

        {/* Navigate button */}
        {onNavigate && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2"
            onClick={onNavigate}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Completion celebration overlay */}
      {isCompleted && animated && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-2 right-2">
            <div className="animate-ping absolute h-2 w-2 rounded-full bg-green-400 opacity-75" />
            <div className="relative h-1 w-1 rounded-full bg-green-500" />
          </div>
        </div>
      )}
    </div>
  )
}