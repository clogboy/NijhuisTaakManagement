import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, MessageCircle, Lightbulb, Target, Sparkles } from "lucide-react";

interface CharacterGuideProps {
  character: "productivity" | "helper" | "expert";
  message: string;
  isVisible: boolean;
  onDismiss?: () => void;
  position?: "bottom-right" | "top-right" | "center";
  showActions?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: "default" | "outline";
  }>;
}

const characterData = {
  productivity: {
    name: "Productiviteit Assistent",
    emoji: "🎯",
    color: "from-red-500 to-red-600",
    accent: "text-red-600",
    personality: "professioneel en behulpzaam"
  },
  helper: {
    name: "AI Helper",
    emoji: "🤖", 
    color: "from-blue-500 to-blue-600",
    accent: "text-blue-600",
    personality: "vriendelijk en informatief"
  },
  expert: {
    name: "Productiviteit Expert",
    emoji: "👩‍💼",
    color: "from-purple-500 to-purple-600", 
    accent: "text-purple-600",
    personality: "ervaren en motiverend"
  }
};

const getPositionClasses = (position: string) => {
  switch (position) {
    case "top-right":
      return "fixed top-4 right-4 z-40";
    case "center":
      return "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50";
    case "bottom-right":
    default:
      return "fixed bottom-4 right-4 z-40";
  }
};

export default function CharacterGuide({
  character,
  message,
  isVisible,
  onDismiss,
  position = "bottom-right",
  showActions = false,
  actions = []
}: CharacterGuideProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  
  const charData = characterData[character] || characterData.productivity;

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setShowBubble(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowBubble(false);
      setIsExpanded(false);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className={getPositionClasses(position)}>
      <AnimatePresence>
        {showBubble && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="max-w-sm"
          >
            <Card className="shadow-lg border-2 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Character Avatar */}
                  <motion.div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${charData.color} flex items-center justify-center text-xl shadow-md flex-shrink-0`}
                    animate={{ 
                      scale: [1, 1.05, 1],
                      rotate: [0, 2, -2, 0]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  >
                    {charData.emoji}
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    {/* Character Name */}
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`font-medium text-sm ${charData.accent}`}>
                        {charData.name}
                      </h4>
                      {onDismiss && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onDismiss}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Message */}
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                      {message}
                    </p>

                    {/* Actions */}
                    {showActions && actions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {actions.map((action, index) => (
                          <Button
                            key={index}
                            variant={action.variant || "outline"}
                            size="sm"
                            onClick={action.action}
                            className="text-xs"
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Speech bubble pointer */}
            <div className={`absolute ${position === "top-right" ? "top-full" : "bottom-full"} right-6 w-0 h-0`}>
              <div className={`
                ${position === "top-right" 
                  ? "border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800" 
                  : "border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white dark:border-b-gray-800"
                }
              `} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}