import { z } from "zod";

/**
 * Cultural date format patterns
 */
export const DATE_FORMATS = {
  'en-US': 'MM/dd/yyyy', // American format
  'en-GB': 'dd/MM/yyyy', // British format
  'de-DE': 'dd.MM.yyyy', // German format
  'fr-FR': 'dd/MM/yyyy', // French format
  'nl-NL': 'dd-MM-yyyy', // Dutch format
  'ja-JP': 'yyyy/MM/dd', // Japanese format
  'ko-KR': 'yyyy. MM. dd', // Korean format
  'zh-CN': 'yyyy/MM/dd', // Chinese format
  'pt-BR': 'dd/MM/yyyy', // Brazilian format
  'es-ES': 'dd/MM/yyyy', // Spanish format
  'it-IT': 'dd/MM/yyyy', // Italian format
  'ru-RU': 'dd.MM.yyyy', // Russian format
  'ar-SA': 'dd/MM/yyyy', // Arabic format
  'hi-IN': 'dd/MM/yyyy', // Hindi format
} as const;

/**
 * Parse date string with cultural context awareness
 */
export function parseDate(dateStr: string, locale?: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;

  // Try ISO format first (universal standard)
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime()) && dateStr.includes('-')) {
    return isoDate;
  }

  // Detect locale from browser or use default
  const userLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  
  // Clean the input
  const cleanStr = dateStr.trim();
  
  // Try different parsing strategies based on locale
  const parsedDate = tryParseWithLocale(cleanStr, userLocale);
  if (parsedDate) return parsedDate;

  // Fallback: try common formats
  const commonFormats = [
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, // dd/mm/yyyy or mm/dd/yyyy
    /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, // yyyy/mm/dd
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/,  // dd/mm/yy or mm/dd/yy
  ];

  for (const format of commonFormats) {
    const match = cleanStr.match(format);
    if (match) {
      const parsedWithFormat = parseWithFormat(match, userLocale);
      if (parsedWithFormat) return parsedWithFormat;
    }
  }

  return null;
}

/**
 * Try to parse date with specific locale format
 */
function tryParseWithLocale(dateStr: string, locale: string): Date | null {
  try {
    // Use Intl.DateTimeFormat to understand locale preferences
    const parts = dateStr.split(/[\/\-\.\s]/);
    if (parts.length !== 3) return null;

    const [part1, part2, part3] = parts.map(p => parseInt(p, 10));
    if (part1 === undefined || part2 === undefined || part3 === undefined) return null;

    // Determine year, month, day based on locale
    let year: number, month: number, day: number;

    // Handle 2-digit years
    const yearPart = Math.max(part1, part2, part3);
    const adjustedYear = yearPart < 100 ? (yearPart < 50 ? 2000 + yearPart : 1900 + yearPart) : yearPart;

    if (locale.startsWith('en-US')) {
      // American format: MM/dd/yyyy
      if (part3 > 31) {
        [month, day, year] = [part1, part2, adjustedYear];
      } else if (part1 > 31) {
        [year, month, day] = [adjustedYear, part2, part3];
      } else {
        [month, day, year] = [part1, part2, part3];
      }
    } else if (locale.startsWith('ja-JP') || locale.startsWith('ko-KR') || locale.startsWith('zh-CN')) {
      // Asian formats: yyyy/MM/dd
      if (part1 > 31) {
        [year, month, day] = [adjustedYear, part2, part3];
      } else {
        [day, month, year] = [part1, part2, adjustedYear];
      }
    } else {
      // European formats: dd/MM/yyyy
      if (part3 > 31) {
        [day, month, year] = [part1, part2, adjustedYear];
      } else if (part1 > 31) {
        [year, month, day] = [adjustedYear, part2, part3];
      } else {
        [day, month, year] = [part1, part2, part3];
      }
    }

    const date = new Date(year, month - 1, day);
    
    // Validate the date is real
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return date;
    }
  } catch (error) {
    // Parsing failed, continue to next method
  }
  
  return null;
}

/**
 * Parse date with regex match based on locale
 */
function parseWithFormat(match: RegExpMatchArray, locale: string): Date | null {
  const [, part1Str, part2Str, part3Str] = match;
  const part1 = parseInt(part1Str, 10);
  const part2 = parseInt(part2Str, 10);
  const part3 = parseInt(part3Str, 10);

  let year: number, month: number, day: number;

  // Handle 2-digit years
  const yearCandidate = Math.max(part1, part2, part3);
  const adjustedYear = yearCandidate < 100 ? (yearCandidate < 50 ? 2000 + yearCandidate : 1900 + yearCandidate) : yearCandidate;

  if (locale.startsWith('en-US')) {
    // MM/dd/yyyy
    [month, day, year] = part3 > 31 ? [part1, part2, part3] : [part1, part2, adjustedYear];
  } else if (locale.startsWith('ja-JP') || locale.startsWith('ko-KR') || locale.startsWith('zh-CN')) {
    // yyyy/MM/dd
    [year, month, day] = part1 > 31 ? [part1, part2, part3] : [adjustedYear, part1, part2];
  } else {
    // dd/MM/yyyy (European default)
    [day, month, year] = part3 > 31 ? [part1, part2, part3] : [part1, part2, adjustedYear];
  }

  try {
    const date = new Date(year, month - 1, day);
    
    // Validate the constructed date
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return date;
    }
  } catch (error) {
    // Invalid date
  }
  
  return null;
}

/**
 * Format date according to locale
 */
export function formatDate(date: Date, locale?: string): string {
  if (!date || isNaN(date.getTime())) return '';
  
  const userLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  
  try {
    return new Intl.DateTimeFormat(userLocale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch (error) {
    // Fallback to ISO format
    return date.toISOString().split('T')[0];
  }
}

/**
 * Zod schema for cultural date validation
 */
export const culturalDateSchema = z.union([
  z.date(),
  z.string().transform((str, ctx) => {
    if (!str || str.trim() === '') return null;
    
    const parsed = parseDate(str);
    if (!parsed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid date format. Please use your local date format (e.g., ${formatDate(new Date(), 'en-US')})`,
      });
      return z.NEVER;
    }
    
    return parsed;
  }),
  z.null(),
]).optional();

/**
 * Get example date format for user's locale
 */
export function getLocaleDateExample(locale?: string): string {
  const userLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  const exampleDate = new Date(2024, 11, 25); // December 25, 2024
  return formatDate(exampleDate, userLocale);
}