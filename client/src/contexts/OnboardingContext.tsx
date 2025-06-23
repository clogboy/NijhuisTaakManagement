import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface OnboardingContextType {
  isFirstTime: boolean;
  showTutorial: boolean;
  currentStep: number;
  completedSteps: Set<string>;
  startTutorial: () => void;
  skipTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  completeStep: (stepId: string) => void;
  resetOnboarding: () => void;
  setCurrentStep: (step: number) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isFirstTime, setIsFirstTime] = useState(() => {
    try {
      const hasVisited = localStorage.getItem('hasVisited');
      return !hasVisited;
    } catch {
      return true;
    }
  });

  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const tutorialState = localStorage.getItem('tutorialState');
      if (tutorialState) {
        const state = JSON.parse(tutorialState);
        setShowTutorial(state.showTutorial || false);
        setCurrentStep(state.currentStep || 0);
        setCompletedSteps(new Set(state.completedSteps || []));
      }
    } catch (error) {
      console.warn('Failed to load tutorial state:', error);
    }
  }, []);

  const saveTutorialState = (updates: Partial<{
    showTutorial: boolean;
    currentStep: number;
    completedSteps: string[];
  }>) => {
    try {
      const currentState = {
        showTutorial,
        currentStep,
        completedSteps: Array.from(completedSteps),
        ...updates
      };
      localStorage.setItem('tutorialState', JSON.stringify(currentState));
    } catch (error) {
      console.warn('Failed to save tutorial state:', error);
    }
  };

  const startTutorial = () => {
    setShowTutorial(true);
    setCurrentStep(0);
    saveTutorialState({ showTutorial: true, currentStep: 0 });
  };

  const skipTutorial = () => {
    setShowTutorial(false);
    setIsFirstTime(false);
    try {
      localStorage.setItem('hasVisited', 'true');
      localStorage.setItem('tutorialSkipped', 'true');
    } catch (error) {
      console.warn('Failed to save tutorial skip state:', error);
    }
    saveTutorialState({ showTutorial: false });
  };

  const nextStep = () => {
    const newStep = currentStep + 1;
    setCurrentStep(newStep);
    saveTutorialState({ currentStep: newStep });
  };

  const prevStep = () => {
    const newStep = Math.max(0, currentStep - 1);
    setCurrentStep(newStep);
    saveTutorialState({ currentStep: newStep });
  };

  const completeStep = (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(stepId);
    setCompletedSteps(newCompleted);
    saveTutorialState({ completedSteps: Array.from(newCompleted) });
  };

  const resetOnboarding = () => {
    setIsFirstTime(true);
    setShowTutorial(false);
    setCurrentStep(0);
    setCompletedSteps(new Set());
    try {
      localStorage.removeItem('hasVisited');
      localStorage.removeItem('tutorialState');
      localStorage.removeItem('tutorialSkipped');
    } catch (error) {
      console.warn('Failed to reset onboarding state:', error);
    }
  };

  useEffect(() => {
    if (isFirstTime) {
      try {
        localStorage.setItem('hasVisited', 'true');
      } catch (error) {
        console.warn('Failed to mark as visited:', error);
      }
      setIsFirstTime(false);
    }
  }, [isFirstTime]);

  return (
    <OnboardingContext.Provider
      value={{
        isFirstTime,
        showTutorial,
        currentStep,
        completedSteps,
        startTutorial,
        skipTutorial,
        nextStep,
        prevStep,
        completeStep,
        resetOnboarding,
        setCurrentStep
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}