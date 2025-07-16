
// Client-side error reporting utility
class ErrorReporter {
  private static instance: ErrorReporter;
  private isEnabled = true;

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  init() {
    // Global error handler for unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno
      });
    });

    // Note: Unhandled rejection handling is done in main.tsx to avoid duplicate listeners

    // React error boundary integration (if needed)
    this.setupReactErrorBoundary();
  }

  private setupReactErrorBoundary() {
    // This would integrate with React's error boundary system
    // For now, we'll just set up console error interception
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Call original console.error
      originalConsoleError.apply(console, args);
      
      // Report to our service
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ');
      
      if (message.includes('Error:') || message.includes('TypeError:')) {
        this.reportError({
          message,
          url: window.location.href,
          level: 'error'
        });
      }
    };
  }

  async reportError(errorData: {
    message: string;
    stack?: string;
    url?: string;
    line?: number;
    column?: number;
    level?: 'error' | 'warn' | 'info';
  }) {
    if (!this.isEnabled) return;

    try {
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...errorData,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          url: errorData.url || window.location.href
        }),
      });
    } catch (error) {
      // Silently fail to avoid infinite loops
      console.warn('Failed to report error:', error);
    }
  }

  disable() {
    this.isEnabled = false;
  }

  enable() {
    this.isEnabled = true;
  }
}

export const errorReporter = ErrorReporter.getInstance();
