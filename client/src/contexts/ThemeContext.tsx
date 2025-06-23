import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface ThemeContextType {
  theme: 'light' | 'dark';
  language: 'en' | 'nl';
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: 'en' | 'nl') => void;
  resetToSystem: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [language, setLanguageState] = useState<'en' | 'nl'>('en');

  // Initialize from system preferences and localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem('userPreferences');
    const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const systemLanguage = navigator.language.startsWith('nl') ? 'nl' : 'en';

    if (savedPreferences) {
      const parsed = JSON.parse(savedPreferences);
      setThemeState(parsed.darkMode ? 'dark' : 'light');
      setLanguageState(parsed.language);
    } else {
      // Use system defaults
      setThemeState(systemDarkMode ? 'dark' : 'light');
      setLanguageState(systemLanguage);
    }
  }, []);

  // Apply theme changes to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const savedPreferences = localStorage.getItem('userPreferences');
      if (!savedPreferences) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    const savedPreferences = localStorage.getItem('userPreferences');
    const preferences = savedPreferences ? JSON.parse(savedPreferences) : {};
    const updatedPreferences = { ...preferences, darkMode: newTheme === 'dark' };
    localStorage.setItem('userPreferences', JSON.stringify(updatedPreferences));
  };

  const setLanguage = (newLanguage: 'en' | 'nl') => {
    setLanguageState(newLanguage);
    const savedPreferences = localStorage.getItem('userPreferences');
    const preferences = savedPreferences ? JSON.parse(savedPreferences) : {};
    const updatedPreferences = { ...preferences, language: newLanguage };
    localStorage.setItem('userPreferences', JSON.stringify(updatedPreferences));
  };

  const resetToSystem = () => {
    const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const systemLanguage = navigator.language.startsWith('nl') ? 'nl' : 'en';
    
    setThemeState(systemDarkMode ? 'dark' : 'light');
    setLanguageState(systemLanguage);
    
    const preferences = {
      darkMode: systemDarkMode,
      language: systemLanguage,
    };
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      language, 
      setTheme, 
      setLanguage, 
      resetToSystem 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const root = window.document.documentElement;
    
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
