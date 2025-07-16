import { nlTranslations } from '@/translations/nl';

export const exportToXML = (): string => {
  const convertObjectToXML = (obj: any, depth = 0): string => {
    const indent = '  '.repeat(depth);
    let xml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        xml += `${indent}<${key}>\n`;
        xml += convertObjectToXML(value, depth + 1);
        xml += `${indent}</${key}>\n`;
      } else {
        const escapedValue = String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
        xml += `${indent}<${key}>${escapedValue}</${key}>\n`;
      }
    }

    return xml;
  };

  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const xmlContent = `<translations>\n${convertObjectToXML(nlTranslations, 1)}</translations>`;
  
  return xmlHeader + xmlContent;
};

export const downloadXMLFile = () => {
  const xmlContent = exportToXML();
  const blob = new Blob([xmlContent], { type: 'application/xml' });
  try {
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nl-translations.xml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the object URL
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download XML file:', error);
    throw new Error('Download failed. Please try again.');
  }
};