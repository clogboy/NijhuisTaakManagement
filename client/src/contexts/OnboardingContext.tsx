import React, { createContext, useContext, useState, useEffect } from "react";

interface OnboardingState {
  hasCompletedTutorial: boolean;
  currentTutorialStep: number;
  isFirstVisit: boolean;
  showCharacterGuide: boolean;
  guidanceMessage: string;
  guideCharacter: "productivity" | "helper" | "expert";
}

interface OnboardingContextType {
  state: OnboardingState;
  startTutorial: () => void;
  completeTutorial: () => void;
  skipTutorial: () => void;
  showGuide: (character: "productivity" | "helper" | "expert", message: string) => void;
  hideGuide: () => void;
  updateTutorialStep: (step: number) => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const ONBOARDING_STORAGE_KEY = "nijflow-onboarding-state";

const defaultState: OnboardingState = {
  hasCompletedTutorial: false,
  currentTutorialStep: 0,
  isFirstVisit: true,
  showCharacterGuide: false,
  guidanceMessage: "",
  guideCharacter: "productivity"
};

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(defaultState);

  // Load onboarding state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (saved) {
        const parsedState = JSON.parse(saved);
        setState(prevState => ({ ...prevState, ...parsedState }));
      }
    } catch (error) {
      console.warn("Failed to load onboarding state:", error);
    }
  }, []);

  // Save onboarding state to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Failed to save onboarding state:", error);
    }
  }, [state]);

  const startTutorial = () => {
    setState(prev => ({
      ...prev,
      currentTutorialStep: 0,
      isFirstVisit: false
    }));
  };

  const completeTutorial = () => {
    setState(prev => ({
      ...prev,
      hasCompletedTutorial: true,
      currentTutorialStep: 0,
      isFirstVisit: false,
      showCharacterGuide: false
    }));
  };

  const skipTutorial = () => {
    setState(prev => ({
      ...prev,
      hasCompletedTutorial: true,
      isFirstVisit: false,
      showCharacterGuide: false
    }));
  };

  const showGuide = (character: "productivity" | "helper" | "expert", message: string) => {
    setState(prev => ({
      ...prev,
      showCharacterGuide: true,
      guideCharacter: character,
      guidanceMessage: message
    }));
  };

  const hideGuide = () => {
    setState(prev => ({
      ...prev,
      showCharacterGuide: false,
      guidanceMessage: ""
    }));
  };

  const updateTutorialStep = (step: number) => {
    setState(prev => ({
      ...prev,
      currentTutorialStep: step
    }));
  };

  const resetOnboarding = () => {
    setState(defaultState);
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  };

  const contextValue: OnboardingContextType = {
    state,
    startTutorial,
    completeTutorial,
    skipTutorial,
    showGuide,
    hideGuide,
    updateTutorialStep,
    resetOnboarding
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}