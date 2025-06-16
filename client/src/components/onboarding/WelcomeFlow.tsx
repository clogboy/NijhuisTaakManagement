import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Target, 
  Calendar,
  Users,
  CheckCircle,
  ArrowRight,
  Building2,
  Rocket
} from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import CharacterGuide from "./CharacterGuide";

interface WelcomeFlowProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WelcomeFlow({ isOpen, onClose }: WelcomeFlowProps) {
  const { startTutorial, skipTutorial } = useOnboarding();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showCharacter, setShowCharacter] = useState(false);

  const welcomeSlides = [
    {
      title: "Welkom bij NijFlow",
      subtitle: "Je persoonlijke productiviteitsplatform",
      description: "Ontdek hoe je efficiënter kunt werken met onze slimme tools en AI-ondersteuning.",
      icon: Building2,
      character: "productivity" as const,
      color: "from-red-500 to-red-600"
    },
    {
      title: "Slimme Taakbeheer",
      subtitle: "Organiseer je werk zoals nooit tevoren",
      description: "Beheer activiteiten, actiepunten en deadlines met intelligente prioritering en automatische planning.",
      icon: Target,
      character: "helper" as const,
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "AI-Gestuurde Planning",
      subtitle: "Laat kunstmatige intelligentie je helpen",
      description: "Onze AI analyseert je werkpatronen en stelt optimale schema's voor met slimme prioritering.",
      icon: Sparkles,
      character: "expert" as const,
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "Naadloze Integratie",
      subtitle: "Verbind met je bestaande tools",
      description: "Synchroniseer met Microsoft Calendar, Teams en BimCollab voor een complete werkervaring.",
      icon: Users,
      character: "productivity" as const,
      color: "from-green-500 to-green-600"
    }
  ];

  const currentSlideData = welcomeSlides[currentSlide];

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setShowCharacter(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentSlide < welcomeSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleStartTutorial = () => {
    startTutorial();
    onClose();
  };

  const handleSkipTutorial = () => {
    skipTutorial();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header with animated background */}
        <div className={`relative p-8 bg-gradient-to-br ${currentSlideData.color} text-white overflow-hidden`}>
          <motion.div
            className="absolute inset-0 opacity-20"
            animate={{
              backgroundPosition: ["0% 0%", "100% 100%"],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          
          <div className="relative z-10">
            <motion.div
              className="flex items-center justify-center mb-4"
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <currentSlideData.icon className="h-8 w-8" />
              </div>
            </motion.div>
            
            <motion.h1 
              className="text-3xl font-bold text-center mb-2"
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {currentSlideData.title}
            </motion.h1>
            
            <motion.p 
              className="text-xl text-center opacity-90"
              key={`${currentSlide}-subtitle`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {currentSlideData.subtitle}
            </motion.p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <motion.p 
            className="text-lg text-gray-600 dark:text-gray-300 text-center mb-8 leading-relaxed"
            key={`${currentSlide}-description`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {currentSlideData.description}
          </motion.p>

          {/* Progress indicators */}
          <div className="flex justify-center space-x-2 mb-8">
            {welcomeSlides.map((_, index) => (
              <motion.div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index === currentSlide 
                    ? 'bg-red-500' 
                    : index < currentSlide 
                    ? 'bg-green-500' 
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
                animate={{ scale: index === currentSlide ? 1.2 : 1 }}
                transition={{ duration: 0.2 }}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentSlide === 0}
              className="flex items-center gap-2"
            >
              Vorige
            </Button>

            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                onClick={handleSkipTutorial}
                className="text-gray-500"
              >
                Overslaan
              </Button>
              
              {currentSlide === welcomeSlides.length - 1 ? (
                <Button
                  onClick={handleStartTutorial}
                  className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                >
                  <Rocket className="h-4 w-4" />
                  Start Tutorial
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                >
                  Volgende
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Character Guide */}
      <CharacterGuide
        character={currentSlideData.character}
        message={`Dit is ${currentSlideData.title.toLowerCase()}! ${currentSlideData.description}`}
        isVisible={showCharacter}
        position="bottom-right"
      />
    </div>
  );
}