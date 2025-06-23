class ErrorReporter {
  private static instance: ErrorReporter;
  private errors: Array<{
    message: string;
    stack?: string;
    timestamp: Date;
    url?: string;
    userAgent?: string;
  }> = [];

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  private setupGlobalErrorHandlers() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.captureError({
          message: event.message,
          stack: event.error?.stack,
          url: event.filename,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.captureError({
          message: `Unhandled Promise Rejection: ${event.reason}`,
          stack: event.reason?.stack,
        });
      });
    }
  }

  captureError(error: {
    message: string;
    stack?: string;
    url?: string;
  }) {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
      url: error.url || (typeof window !== 'undefined' ? window.location.href : undefined),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    this.errors.push(errorReport);
    console.error('Error captured:', errorReport);

    // Keep only the last 100 errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }
  }

  getErrors() {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
  }

  async reportError(error: Error, context?: any) {
    this.captureError({
      message: error.message,
      stack: error.stack,
    });

    // In a real application, you would send this to an error reporting service
    console.log('Error reported:', error, context);
  }
}

export const errorReporter = ErrorReporter.getInstance();