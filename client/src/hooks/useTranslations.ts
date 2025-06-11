import { useState, useEffect } from 'react';

interface TranslationNode {
  [key: string]: string | TranslationNode;
}

interface Translations extends TranslationNode {}

let cachedTranslations: Translations | null = null;

const parseXMLToObject = (xmlString: string): Translations => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  const parseNode = (node: Element): TranslationNode => {
    const result: TranslationNode = {};
    
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.children.length === 0) {
        // Leaf node - contains text
        result[child.tagName] = child.textContent || '';
      } else {
        // Branch node - contains other nodes
        result[child.tagName] = parseNode(child);
      }
    }
    
    return result;
  };
  
  const rootElement = xmlDoc.documentElement;
  return parseNode(rootElement) as Translations;
};

const loadTranslations = async (): Promise<Translations> => {
  if (cachedTranslations) {
    return cachedTranslations;
  }
  
  try {
    const response = await fetch('/src/translations/nl.xml');
    const xmlText = await response.text();
    cachedTranslations = parseXMLToObject(xmlText);
    return cachedTranslations;
  } catch (error) {
    console.error('Failed to load translations:', error);
    // Return empty object as fallback
    return {};
  }
};

export const useTranslations = () => {
  const [translations, setTranslations] = useState<Translations>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTranslations().then((loadedTranslations) => {
      setTranslations(loadedTranslations);
      setIsLoading(false);
    });
  }, []);

  const t = (path: string, fallback?: string): string => {
    const keys = path.split('.');
    let current: any = translations;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Return fallback or the last part of the path if no translation found
        return fallback || keys[keys.length - 1];
      }
    }
    
    return typeof current === 'string' ? current : fallback || path;
  };

  return { t, isLoading };
};

// Helper function for static translations (when hooks can't be used)
export const getTranslation = (path: string, fallback?: string): Promise<string> => {
  return loadTranslations().then((translations) => {
    const keys = path.split('.');
    let current: any = translations;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return fallback || keys[keys.length - 1];
      }
    }
    
    return typeof current === 'string' ? current : fallback || path;
  });
};