import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LowStimulusContextType {
  isLowStimulusMode: boolean;
  toggleLowStimulusMode: () => void;
}

const LowStimulusContext = createContext<LowStimulusContextType | undefined>(undefined);

export function LowStimulusProvider({ children }: { children: ReactNode }) {
  const [isLowStimulusMode, setIsLowStimulusMode] = useState(() => {
    try {
      const saved = localStorage.getItem('lowStimulusMode');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const toggleLowStimulusMode = () => {
    setIsLowStimulusMode((prev: boolean) => {
      const newValue = !prev;
      try {
        localStorage.setItem('lowStimulusMode', JSON.stringify(newValue));
      } catch (error) {
        console.warn('Failed to save low stimulus mode preference:', error);
      }
      return newValue;
    });
  };

  return (
    <LowStimulusContext.Provider 
      value={{ 
        isLowStimulusMode, 
        toggleLowStimulusMode 
      }}
    >
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