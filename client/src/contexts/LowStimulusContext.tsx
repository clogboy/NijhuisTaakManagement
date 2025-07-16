import { createContext, useContext, useState, ReactNode } from "react";

interface LowStimulusContextType {
  lowStimulus: boolean;
  isLowStimulusMode: boolean;
  activateLowStimulus: () => void;
  deactivateLowStimulus: () => void;
  setLowStimulus: (value: boolean) => void;
}

const LowStimulusContext = createContext<LowStimulusContextType | undefined>(undefined);

export function LowStimulusProvider({ children }: { children: ReactNode }) {
  const [isLowStimulusMode, setIsLowStimulusMode] = useState(false);

  const activateLowStimulus = () => {
    setIsLowStimulusMode(true);
    // Apply low stimulus styling to body with error handling
    try {
      document.body?.classList.add('low-stimulus-mode');
    } catch (error) {
      console.warn('Failed to add low-stimulus-mode class:', error);
    }
  };

  const deactivateLowStimulus = () => {
    setIsLowStimulusMode(false);
    // Remove low stimulus styling from body with error handling
    try {
      document.body?.classList.remove('low-stimulus-mode');
    } catch (error) {
      console.warn('Failed to remove low-stimulus-mode class:', error);
    }
  };

  const setLowStimulus = (value: boolean) => {
    if (value) {
      activateLowStimulus();
    } else {
      deactivateLowStimulus();
    }
  };

  return (
    <LowStimulusContext.Provider value={{
      lowStimulus: isLowStimulusMode,
      isLowStimulusMode,
      activateLowStimulus,
      deactivateLowStimulus,
      setLowStimulus,
    }}>
      {children}
    </LowStimulusContext.Provider>
  );
}

export function useLowStimulus() {
  const context = useContext(LowStimulusContext);
  if (context === undefined) {
    throw new Error('useLowStimulus must be used within a LowStimulusProvider');
  }
  return context;
}