
import { emailService } from './email-service';
import { logger } from './utils/logger';

interface ErrorEntry {
  timestamp: Date;
  message: string;
  stack?: string;
  userAgent?: string;
  url?: string;
  level: string;
  userId?: number;
}

class ErrorReportingService {
  private errors: ErrorEntry[] = [];
  private lastReportDate: Date | null = null;
  private dailyReportTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startDailyReporting();
  }

  logError(error: Omit<ErrorEntry, 'timestamp'>) {
    this.errors.push({
      ...error,
      timestamp: new Date()
    });

    // Keep only last 1000 errors to prevent memory issues
    if (this.errors.length > 1000) {
      this.errors = this.errors.slice(-1000);
    }

    logger.error('Error logged', { error });
  }

  private startDailyReporting() {
    // Send report at 9 AM every day
    const scheduleNextReport = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      
      const msUntilReport = tomorrow.getTime() - now.getTime();
      
      this.dailyReportTimer = setTimeout(async () => {
        await this.sendDailyReport();
        scheduleNextReport(); // Schedule next day's report
      }, msUntilReport);
    };

    scheduleNextReport();
  }

  async sendDailyReport() {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);

      const recentErrors = this.errors.filter(error => 
        error.timestamp >= yesterday && error.timestamp < todayStart
      );

      if (recentErrors.length === 0 && !this.shouldSendEmptyReport()) {
        logger.info('No errors to report for daily digest');
        return;
      }

      const errorSummary = this.generateErrorSummary(recentErrors);
      
      await emailService.sendEmail({
        to: 'b.weinreder@nijhuis.nl',
        subject: `Daily Error Report - ${yesterday.toDateString()} (${recentErrors.length} errors)`,
        html: `
          <h2>Daily Error Report</h2>
          <p><strong>Date:</strong> ${yesterday.toDateString()}</p>
          <p><strong>Total Errors:</strong> ${recentErrors.length}</p>
          
          ${recentErrors.length > 0 ? `
            <h3>Error Summary:</h3>
            ${errorSummary}
            
            <h3>Recent Errors:</h3>
            <ul>
              ${recentErrors.slice(0, 10).map(error => `
                <li>
                  <strong>${error.level.toUpperCase()}:</strong> ${error.message}<br>
                  <small>Time: ${error.timestamp.toLocaleString()}</small><br>
                  ${error.url ? `<small>URL: ${error.url}</small><br>` : ''}
                  ${error.stack ? `<details><summary>Stack Trace</summary><pre>${error.stack}</pre></details>` : ''}
                </li>
              `).join('')}
            </ul>
            ${recentErrors.length > 10 ? `<p><em>... and ${recentErrors.length - 10} more errors</em></p>` : ''}
          ` : '<p>No errors reported in the last 24 hours. System is running smoothly!</p>'}
          
          <hr>
          <p><small>This is an automated report from your application monitoring system.</small></p>
        `
      });

      this.lastReportDate = today;
      logger.info(`Daily error report sent successfully. ${recentErrors.length} errors reported.`);
    } catch (error) {
      logger.error('Failed to send daily error report', { error });
    }
  }

  private generateErrorSummary(errors: ErrorEntry[]) {
    const errorCounts = errors.reduce((acc, error) => {
      const key = error.message.substring(0, 100); // First 100 chars as key
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return `
      <table border="1" style="border-collapse: collapse; width: 100%;">
        <tr>
          <th style="padding: 8px;">Error Message</th>
          <th style="padding: 8px;">Count</th>
        </tr>
        ${topErrors.map(([message, count]) => `
          <tr>
            <td style="padding: 8px;">${message}</td>
            <td style="padding: 8px;">${count}</td>
          </tr>
        `).join('')}
      </table>
    `;
  }

  private shouldSendEmptyReport(): boolean {
    // Send empty report once per week to confirm system is working
    if (!this.lastReportDate) return true;
    
    const daysSinceLastReport = Math.floor(
      (Date.now() - this.lastReportDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysSinceLastReport >= 7;
  }

  async triggerReport() {
    await this.sendDailyReport();
  }

  getStatus() {
    return {
      totalErrors: this.errors.length,
      lastReportDate: this.lastReportDate,
      recentErrorCount: this.errors.filter(e => 
        Date.now() - e.timestamp.getTime() < 24 * 60 * 60 * 1000
      ).length
    };
  }

  destroy() {
    if (this.dailyReportTimer) {
      clearTimeout(this.dailyReportTimer);
      this.dailyReportTimer = null;
    }
  }
}

export const errorReportingService = new ErrorReportingService();

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
  private errorLog: ErrorReport[] = [];
  private isInitialized = false;
  
  initialize() {
    if (this.isInitialized) return;
    
    // Schedule daily error report email
    this.scheduleDailyReport();
    this.isInitialized = true;
  }
  
  logError(error: ErrorReport) {
    this.errorLog.push(error);
    console.error('[ERROR REPORTING]', error);
  }
  
  private scheduleDailyReport() {
    // Send daily error report at 8 AM
    const scheduleNextReport = () => {
      const now = new Date();
      const nextReport = new Date();
      nextReport.setHours(8, 0, 0, 0);
      
      // If 8 AM already passed today, schedule for tomorrow
      if (nextReport <= now) {
        nextReport.setDate(nextReport.getDate() + 1);
      }
      
      const timeUntilReport = nextReport.getTime() - now.getTime();
      
      setTimeout(() => {
        this.sendDailyErrorReport();
        scheduleNextReport(); // Schedule next day
      }, timeUntilReport);
    };
    
    scheduleNextReport();
  }
  
  private async sendDailyErrorReport() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailyErrors = this.errorLog.filter(error => {
      const errorDate = new Date(error.timestamp);
      return errorDate >= yesterday && errorDate < today;
    });
    
    if (dailyErrors.length === 0) {
      console.log('[ERROR REPORTING] No errors to report for yesterday');
      return;
    }
    
    const errorSummary = this.generateErrorSummary(dailyErrors);
    
    try {
      // Send email report (integrate with your email service)
      await this.emailService.sendErrorReport(errorSummary);
      console.log(`[ERROR REPORTING] Daily error report sent: ${dailyErrors.length} errors`);
    } catch (error) {
      console.error('[ERROR REPORTING] Failed to send daily error report:', error);
    }
  }
  
  private generateErrorSummary(errors: ErrorReport[]) {
    const errorsByType = errors.reduce((acc, error) => {
      const key = error.message.split(':')[0] || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalErrors: errors.length,
      errorsByType,
      criticalErrors: errors.filter(e => e.level === 'error').length,
      timeRange: {
        start: errors[0]?.timestamp,
        end: errors[errors.length - 1]?.timestamp
      }
    };
  }
}

export const errorReportingService = new ErrorReportingService();

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
