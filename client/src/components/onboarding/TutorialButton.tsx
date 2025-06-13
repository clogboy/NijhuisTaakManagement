import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, 
  Sparkles, 
  Play, 
  RotateCcw,
  BookOpen,
  MessageCircle
} from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import OnboardingTutorial from "./OnboardingTutorial";
import WelcomeFlow from "./WelcomeFlow";

export default function TutorialButton() {
  const { state: onboardingState, startTutorial, resetOnboarding, showGuide } = useOnboarding();
  const [showTutorial, setShowTutorial] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStartTutorial = () => {
    startTutorial();
    setShowTutorial(true);
    setIsExpanded(false);
  };

  const handleShowWelcome = () => {
    setShowWelcome(true);
    setIsExpanded(false);
  };

  const handleResetOnboarding = () => {
    resetOnboarding();
    setShowWelcome(true);
    setIsExpanded(false);
  };

  const handleShowGuide = () => {
    showGuide("helper", "Heb je hulp nodig? Ik kan je helpen met de belangrijkste functies van het platform!");
    setIsExpanded(false);
  };

  return (
    <>
      <div className="fixed bottom-6 left-6 z-40">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="absolute bottom-16 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-64"
            >
              <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Tutorial Opties
              </h3>
              
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShowWelcome}
                  className="w-full justify-start"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Welkom Tour
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartTutorial}
                  className="w-full justify-start"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Interactieve Tutorial
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShowGuide}
                  className="w-full justify-start"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Vraag Hulp
                </Button>
                
                {onboardingState.hasCompletedTutorial && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetOnboarding}
                    className="w-full justify-start text-orange-600 hover:text-orange-700"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Tutorial
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 shadow-lg flex items-center justify-center relative"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <HelpCircle className="h-7 w-7 text-white" />
            </motion.div>
            
            {!onboardingState.hasCompletedTutorial && (
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.8, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                <Badge className="bg-yellow-500 text-yellow-900 text-xs px-1">
                  Nieuw
                </Badge>
              </motion.div>
            )}
          </Button>
        </motion.div>
      </div>

      {/* Tutorial Components */}
      <OnboardingTutorial
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={() => {
          setShowTutorial(false);
        }}
      />

      <WelcomeFlow
        isOpen={showWelcome}
        onClose={() => setShowWelcome(false)}
      />
    </>
  );
}