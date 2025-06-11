"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"
import { CheckCircle, Circle, Clock, Zap } from "lucide-react"

interface AnimatedProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number
  showPercentage?: boolean
  animated?: boolean
  variant?: "default" | "success" | "warning" | "error"
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
  label?: string
}

const AnimatedProgress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  AnimatedProgressProps
>(({ 
  className, 
  value = 0, 
  showPercentage = false, 
  animated = true,
  variant = "default",
  size = "md",
  showIcon = false,
  label,
  ...props 
}, ref) => {
  const [displayValue, setDisplayValue] = React.useState(0)
  const [isComplete, setIsComplete] = React.useState(false)

  React.useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayValue(value)
        if (value === 100) {
          setTimeout(() => setIsComplete(true), 500)
        }
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setDisplayValue(value)
      setIsComplete(value === 100)
    }
  }, [value, animated])

  const getVariantClasses = () => {
    switch (variant) {
      case "success":
        return "bg-green-500 dark:bg-green-400"
      case "warning":
        return "bg-yellow-500 dark:bg-yellow-400"
      case "error":
        return "bg-red-500 dark:bg-red-400"
      default:
        return "bg-blue-500 dark:bg-blue-400"
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-2"
      case "lg":
        return "h-6"
      default:
        return "h-4"
    }
  }

  const getIcon = () => {
    if (isComplete) {
      return <CheckCircle className="h-4 w-4 text-green-500 animate-bounce" />
    }
    if (displayValue > 0) {
      return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />
    }
    return <Circle className="h-4 w-4 text-gray-400" />
  }

  return (
    <div className="space-y-2">
      {(label || showIcon || showPercentage) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showIcon && getIcon()}
            {label && (
              <span className={cn(
                "text-sm font-medium",
                isComplete ? "text-green-600 dark:text-green-400" : "text-gray-700 dark:text-gray-300"
              )}>
                {label}
              </span>
            )}
          </div>
          {showPercentage && (
            <span className={cn(
              "text-sm font-medium transition-colors duration-300",
              isComplete ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-400"
            )}>
              {Math.round(displayValue)}%
            </span>
          )}
        </div>
      )}
      
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700",
          getSizeClasses(),
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full flex-1 transition-all duration-700 ease-out",
            getVariantClasses(),
            animated && "transform-gpu",
            isComplete && "animate-pulse"
          )}
          style={{ 
            transform: `translateX(-${100 - displayValue}%)`,
            transition: animated ? "transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)" : "none"
          }}
        />
        
        {/* Shimmer effect for active progress */}
        {displayValue > 0 && displayValue < 100 && (
          <div className="absolute inset-0 overflow-hidden">
            <div className={cn(
              "absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent",
              "animate-shimmer transform -skew-x-12"
            )} />
          </div>
        )}
        
        {/* Success celebration effect */}
        {isComplete && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-ping absolute h-2 w-2 rounded-full bg-green-400 opacity-75" />
            <div className="relative h-1 w-1 rounded-full bg-green-500" />
          </div>
        )}
      </ProgressPrimitive.Root>
    </div>
  )
})

AnimatedProgress.displayName = "AnimatedProgress"

export { AnimatedProgress }