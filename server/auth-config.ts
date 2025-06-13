// Authentication configuration
// Set to 'microsoft' for current testing, 'replit' for future migration
export const AUTH_PROVIDER = process.env.AUTH_PROVIDER || 'microsoft';

export const authConfig = {
  provider: AUTH_PROVIDER,
  enableReplitAuth: AUTH_PROVIDER === 'replit',
  enableMicrosoftAuth: AUTH_PROVIDER === 'microsoft',
};