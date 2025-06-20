
import { emailService } from './email-service';
import { logger } from './utils/logger';

interface ErrorReport {
  timestamp: string;
  message: string;
  stack?: string;
  userAgent?: string;
  url?: string;
  userId?: number;
  level: 'error' | 'warn' | 'info';
}

class ErrorReportingService {
  private errors: ErrorReport[] = [];
  private isReportingEnabled = process.env.NODE_ENV === 'production';
  private reportEmail = process.env.ERROR_REPORT_EMAIL || 'b.weinreder@nijhuis.nl';
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.startDailyReporting();
  }

  /**
   * Log an error for daily reporting
   */
  logError(error: Partial<ErrorReport>) {
    if (!this.isReportingEnabled) return;

    const errorReport: ErrorReport = {
      timestamp: new Date().toISOString(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      userAgent: error.userAgent,
      url: error.url,
      userId: error.userId,
      level: error.level || 'error'
    };

    this.errors.push(errorReport);
    
    // Keep only last 1000 errors to prevent memory issues
    if (this.errors.length > 1000) {
      this.errors = this.errors.slice(-1000);
    }

    logger.error('Error logged for daily report', errorReport);
  }

  /**
   * Start daily error reporting at 8 AM
   */
  private startDailyReporting() {
    if (!this.isReportingEnabled) {
      logger.info('Error reporting disabled in development');
      return;
    }

    logger.info('Starting daily error reporting service');

    // Calculate time until next 8 AM
    const now = new Date();
    const nextReport = new Date();
    nextReport.setHours(8, 0, 0, 0);
    
    // If it's already past 8 AM today, schedule for tomorrow
    if (now.getHours() >= 8) {
      nextReport.setDate(nextReport.getDate() + 1);
    }

    const timeUntilNextReport = nextReport.getTime() - now.getTime();

    // Set initial timeout to 8 AM, then run every 24 hours
    setTimeout(() => {
      this.sendDailyReport();
      
      // Set up daily interval
      this.intervalId = setInterval(() => {
        this.sendDailyReport();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, timeUntilNextReport);

    logger.info(`Next error report scheduled for: ${nextReport.toISOString()}`);
  }

  /**
   * Send daily error report
   */
  private async sendDailyReport() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Filter errors from the last 24 hours
      const recentErrors = this.errors.filter(error => {
        const errorTime = new Date(error.timestamp);
        return errorTime >= yesterday;
      });

      if (recentErrors.length === 0) {
        logger.info('No errors to report in the last 24 hours');
        return;
      }

      // Group errors by type
      const errorsByType = recentErrors.reduce((acc, error) => {
        const key = error.message;
        if (!acc[key]) {
          acc[key] = { count: 0, examples: [], level: error.level };
        }
        acc[key].count++;
        if (acc[key].examples.length < 3) {
          acc[key].examples.push(error);
        }
        return acc;
      }, {} as Record<string, { count: number; examples: ErrorReport[]; level: string }>);

      // Generate email content
      const subject = `NijFlow Daily Error Report - ${recentErrors.length} errors in last 24h`;
      
      const htmlContent = this.generateErrorReportHTML(recentErrors, errorsByType, yesterday);
      const textContent = this.generateErrorReportText(recentErrors, errorsByType, yesterday);

      // Send email
      const success = await emailService.sendEmail({
        to: this.reportEmail,
        from: process.env.FROM_EMAIL || 'noreply@nijhuis.nl',
        subject,
        text: textContent,
        html: htmlContent
      });

      if (success) {
        logger.info(`Daily error report sent successfully - ${recentErrors.length} errors reported`);
        // Clear reported errors to avoid duplicate reporting
        this.errors = this.errors.filter(error => {
          const errorTime = new Date(error.timestamp);
          return errorTime < yesterday;
        });
      } else {
        logger.error('Failed to send daily error report');
      }
    } catch (error) {
      logger.error('Error in daily reporting service', error);
    }
  }

  /**
   * Generate HTML email content
   */
  private generateErrorReportHTML(
    errors: ErrorReport[], 
    errorsByType: Record<string, any>, 
    since: Date
  ): string {
    const errorLevels = {
      error: errors.filter(e => e.level === 'error').length,
      warn: errors.filter(e => e.level === 'warn').length,
      info: errors.filter(e => e.level === 'info').length
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .summary { background: #f8f9fa; padding: 15px; margin: 20px 0; border-left: 4px solid #007bff; }
          .error-group { background: white; border: 1px solid #dee2e6; margin: 10px 0; padding: 15px; }
          .error-level-error { border-left: 4px solid #dc3545; }
          .error-level-warn { border-left: 4px solid #ffc107; }
          .error-level-info { border-left: 4px solid #17a2b8; }
          .error-details { background: #f8f9fa; padding: 10px; margin: 10px 0; font-size: 12px; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NijFlow Daily Error Report</h1>
            <p>Period: ${since.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}</p>
          </div>
          
          <div class="summary">
            <h2>Summary</h2>
            <p><strong>Total Errors:</strong> ${errors.length}</p>
            <p><strong>Error Types:</strong> ${Object.keys(errorsByType).length}</p>
            <p><strong>By Level:</strong> 
              ${errorLevels.error} errors, 
              ${errorLevels.warn} warnings, 
              ${errorLevels.info} info messages
            </p>
          </div>

          <h2>Error Details</h2>
          ${Object.entries(errorsByType)
            .sort(([,a], [,b]) => b.count - a.count)
            .map(([errorType, data]) => `
              <div class="error-group error-level-${data.level}">
                <h3>${errorType}</h3>
                <p><strong>Occurrences:</strong> ${data.count}</p>
                <p><strong>Level:</strong> ${data.level.toUpperCase()}</p>
                
                <h4>Recent Examples:</h4>
                ${data.examples.map((example: ErrorReport) => `
                  <div class="error-details">
                    <strong>Time:</strong> ${new Date(example.timestamp).toLocaleString()}<br>
                    ${example.url ? `<strong>URL:</strong> ${example.url}<br>` : ''}
                    ${example.userId ? `<strong>User ID:</strong> ${example.userId}<br>` : ''}
                    ${example.userAgent ? `<strong>User Agent:</strong> ${example.userAgent}<br>` : ''}
                    ${example.stack ? `<strong>Stack:</strong><br><pre style="font-size: 10px; background: #e9ecef; padding: 5px;">${example.stack}</pre>` : ''}
                  </div>
                `).join('')}
              </div>
            `).join('')}

          <div class="footer">
            <p>This report was generated automatically by NijFlow Error Reporting Service</p>
            <p>Environment: ${process.env.NODE_ENV || 'production'}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email content
   */
  private generateErrorReportText(
    errors: ErrorReport[], 
    errorsByType: Record<string, any>, 
    since: Date
  ): string {
    const errorLevels = {
      error: errors.filter(e => e.level === 'error').length,
      warn: errors.filter(e => e.level === 'warn').length,
      info: errors.filter(e => e.level === 'info').length
    };

    return `
NijFlow Daily Error Report
Period: ${since.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}

SUMMARY
=======
Total Errors: ${errors.length}
Error Types: ${Object.keys(errorsByType).length}
By Level: ${errorLevels.error} errors, ${errorLevels.warn} warnings, ${errorLevels.info} info messages

ERROR DETAILS
=============
${Object.entries(errorsByType)
  .sort(([,a], [,b]) => b.count - a.count)
  .map(([errorType, data]) => `
${errorType}
${'='.repeat(errorType.length)}
Occurrences: ${data.count}
Level: ${data.level.toUpperCase()}

Recent Examples:
${data.examples.map((example: ErrorReport) => `
  Time: ${new Date(example.timestamp).toLocaleString()}
  ${example.url ? `URL: ${example.url}` : ''}
  ${example.userId ? `User ID: ${example.userId}` : ''}
  ${example.stack ? `Stack: ${example.stack}` : ''}
`).join('\n')}
`).join('\n')}

---
This report was generated automatically by NijFlow Error Reporting Service
Environment: ${process.env.NODE_ENV || 'production'}
    `;
  }

  /**
   * Manually trigger error report (for testing)
   */
  async triggerReport() {
    logger.info('Manually triggering error report');
    await this.sendDailyReport();
  }

  /**
   * Get current error reporting status
   */
  getStatus() {
    return {
      isEnabled: this.isReportingEnabled,
      errorCount: this.errors.length,
      reportEmail: this.reportEmail,
      nextReport: this.getNextReportTime()
    };
  }

  /**
   * Get next report time
   */
  private getNextReportTime(): string {
    const next8AM = new Date();
    next8AM.setHours(8, 0, 0, 0);
    
    if (new Date().getHours() >= 8) {
      next8AM.setDate(next8AM.getDate() + 1);
    }
    
    return next8AM.toISOString();
  }

  /**
   * Stop the reporting service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info('Error reporting service stopped');
  }
}

export const errorReportingService = new ErrorReportingService();
