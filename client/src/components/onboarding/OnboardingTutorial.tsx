import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Sparkles, 
  Target, 
  Calendar,
  Users,
  CheckCircle,
  Lightbulb,
  AlertTriangle,
  Coffee
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/hooks/useTranslations";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string;
  character: "productivity" | "helper" | "expert";
  action?: "highlight" | "click" | "navigate";
  completion?: boolean;
}

interface OnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const CharacterAvatar = ({ character, emotion = "happy" }: { character: string; emotion?: string }) => {
  const getCharacterEmoji = () => {
    switch (character) {
      case "productivity":
        return "🎯";
      case "helper":
        return "🤖";
      case "expert":
        return "👩‍💼";
      default:
        return "😊";
    }
  };

  return (
    <motion.div
      className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-2xl shadow-lg"
      animate={{ 
        scale: [1, 1.1, 1],
        rotate: [0, 5, -5, 0]
      }}
      transition={{ 
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse"
      }}
    >
      {getCharacterEmoji()}
    </motion.div>
  );
};

export default function OnboardingTutorial({ isOpen, onClose, onComplete }: OnboardingTutorialProps) {
  const { t } = useTranslations();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const tutorialSteps: TutorialStep[] = [
    {
      id: "welcome",
      title: "Welkom bij NijFlow!",
      description: "Hallo! Ik ben je persoonlijke gids. Laten we samen ontdekken hoe je het meeste uit dit platform haalt.",
      character: "productivity"
    },
    {
      id: "dashboard",
      title: "Je Dashboard Overzicht",
      description: "Dit is je hoofddashboard waar je alle belangrijke informatie ziet. Hier krijg je een overzicht van je taken, urgente items en voortgang.",
      character: "helper",
      targetElement: ".dashboard-stats"
    },
    {
      id: "activities",
      title: "Activiteiten Beheren",
      description: "In de Activiteiten sectie beheer je al je taken. Je kunt nieuwe activiteiten aanmaken, prioriteiten instellen en deadlines volgen.",
      character: "expert",
      action: "navigate"
    },
    {
      id: "subtasks",
      title: "Subtaken Organiseren",
      description: "Elke activiteit kan subtaken hebben. Deze kun je classificeren als taken, quick wins of wegversperringen voor betere organisatie.",
      character: "helper"
    },
    {
      id: "time-blocking",
      title: "Slimme Tijdplanning",
      description: "Gebruik tijdblokken om je dag te plannen. Het systeem integreert met je Microsoft Calendar voor naadloze planning.",
      character: "expert"
    },
    {
      id: "ai-agenda",
      title: "AI-Gestuurde Agenda",
      description: "Laat onze AI je helpen met dagelijkse planning. We gebruiken slimme prioritering om taken optimaal in te delen.",
      character: "productivity"
    },
    {
      id: "contacts",
      title: "Contacten & Samenwerking",
      description: "Beheer je contacten en werk samen met collega's. Eenvoudig contacten beheren en e-mails versturen.",
      character: "helper"
    },
    {
      id: "completion",
      title: "Klaar om te Beginnen!",
      description: "Geweldig! Je bent nu klaar om het platform ten volle te benutten. Veel succes met je productiviteit!",
      character: "productivity",
      completion: true
    }
  ];

  const currentStepData = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      const newCompleted = new Set(completedSteps);
      newCompleted.add(currentStepData.id);
      setCompletedSteps(newCompleted);
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(currentStepData.id);
    setCompletedSteps(newCompleted);
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CharacterAvatar character={currentStepData.character} />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  NijFlow Gids
                </h2>
                <Badge variant="secondary" className="text-xs">
                  Stap {currentStep + 1} van {tutorialSteps.length}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(progress)}% voltooid
            </p>
          </div>

          {/* Content */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {currentStepData.completion ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : currentStepData.character === "productivity" ? (
                    <Target className="h-5 w-5 text-red-500" />
                  ) : currentStepData.character === "helper" ? (
                    <Lightbulb className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-purple-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    {currentStepData.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    {currentStepData.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Elements */}
          {currentStepData.id === "dashboard" && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Coffee className="h-4 w-4" />
                <span className="text-sm font-medium">Pro Tip:</span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Je kunt altijd terug naar het dashboard door op het NijFlow logo te klikken!
              </p>
            </div>
          )}

          {currentStepData.id === "ai-agenda" && (
            <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">AI Magic:</span>
              </div>
              <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                De AI analyseert je taken en stelt optimale planningen voor gebaseerd op urgentie en belangrijkheid.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Vorige
            </Button>

            <div className="flex gap-2">
              {!currentStepData.completion && (
                <Button variant="ghost" onClick={handleSkip} size="sm">
                  Overslaan
                </Button>
              )}
              
              <Button
                onClick={currentStepData.completion ? handleComplete : handleNext}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
              >
                {currentStepData.completion ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Voltooien
                  </>
                ) : (
                  <>
                    Volgende
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}