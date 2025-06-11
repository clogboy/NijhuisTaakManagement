import { nlTranslations } from '@/translations/nl';

export const useTranslations = () => {
  const t = (path: string, fallback?: string): string => {
    const keys = path.split('.');
    let current: any = nlTranslations;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return fallback || keys[keys.length - 1];
      }
    }
    
    return typeof current === 'string' ? current : fallback || path;
  };

  return { t, isLoading: false };
};

// Helper function for static translations
export const getTranslation = (path: string, fallback?: string): string => {
  const keys = path.split('.');
  let current: any = nlTranslations;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return fallback || keys[keys.length - 1];
    }
  }
  
  return typeof current === 'string' ? current : fallback || path;
};