import { MailService } from '@sendgrid/mail';

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private mailService: MailService;
  private isConfigured: boolean = false;

  constructor() {
    this.mailService = new MailService();
    this.setupService();
  }

  private setupService() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      this.mailService.setApiKey(apiKey);
      this.isConfigured = true;
    } else {
      console.warn('[EMAIL] SendGrid API key not configured. Email notifications will be logged only.');
    }
  }

  async sendActivityInvitation(
    participantEmail: string,
    activityTitle: string,
    activityDescription: string,
    authorName: string,
    authorEmail: string,
    activityId: number
  ): Promise<boolean> {
    const testingUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5000' 
      : 'https://your-deployment-url.replit.app';

    const subject = `You've been invited to collaborate on: ${activityTitle}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0078d4; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #0078d4; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NijFlow Activity Invitation</h1>
          </div>
          <div class="content">
            <h2>You've been invited to collaborate!</h2>
            <p><strong>${authorName}</strong> (${authorEmail}) has invited you to participate in the following activity:</p>
            
            <h3>${activityTitle}</h3>
            ${activityDescription ? `<p><strong>Description:</strong> ${activityDescription}</p>` : ''}
            
            <p>As a participant, you can view this activity and any tasks assigned to you will appear in your dashboard.</p>
            
            <a href="${testingUrl}" class="button">Access NijFlow (Testing Environment)</a>
            
            <p><strong>Note:</strong> This is a testing environment. You'll need to create an account or log in with your Nijhuis credentials to access the activity.</p>
          </div>
          <div class="footer">
            <p>This email was sent from NijFlow - Intelligent Productivity Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
You've been invited to collaborate on: ${activityTitle}

${authorName} (${authorEmail}) has invited you to participate in this activity.

${activityDescription ? `Description: ${activityDescription}` : ''}

As a participant, you can view this activity and any tasks assigned to you will appear in your dashboard.

Access NijFlow: ${testingUrl}

Note: This is a testing environment. You'll need to create an account or log in with your Nijhuis credentials to access the activity.
    `;

    return await this.sendEmail({
      to: participantEmail,
      from: (process.env.FROM_EMAIL as string) || 'noreply@nijhuis.nl',
      subject,
      text: textContent,
      html: htmlContent
    });
  }

  async sendCollaboratorInvitation(
    collaboratorEmail: string,
    activityTitle: string,
    activityDescription: string,
    authorName: string,
    authorEmail: string,
    activityId: number
  ): Promise<boolean> {
    const testingUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5000' 
      : 'https://your-deployment-url.replit.app';

    const subject = `You've been added as a collaborator on: ${activityTitle}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0078d4; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #0078d4; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NijFlow Collaboration Invitation</h1>
          </div>
          <div class="content">
            <h2>You've been added as a collaborator!</h2>
            <p><strong>${authorName}</strong> (${authorEmail}) has added you as a collaborator on the following activity:</p>
            
            <h3>${activityTitle}</h3>
            ${activityDescription ? `<p><strong>Description:</strong> ${activityDescription}</p>` : ''}
            
            <p>As a collaborator, you have read-only access to view this activity and track its progress.</p>
            
            <a href="${testingUrl}" class="button">Access NijFlow (Testing Environment)</a>
            
            <p><strong>Note:</strong> This is a testing environment. You'll need to create an account or log in with your Nijhuis credentials to access the activity.</p>
          </div>
          <div class="footer">
            <p>This email was sent from NijFlow - Intelligent Productivity Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
You've been added as a collaborator on: ${activityTitle}

${authorName} (${authorEmail}) has added you as a collaborator on this activity.

${activityDescription ? `Description: ${activityDescription}` : ''}

As a collaborator, you have read-only access to view this activity and track its progress.

Access NijFlow: ${testingUrl}

Note: This is a testing environment. You'll need to create an account or log in with your Nijhuis credentials to access the activity.
    `;

    return await this.sendEmail({
      to: collaboratorEmail,
      from: (process.env.FROM_EMAIL as string) || 'noreply@nijhuis.nl',
      subject,
      text: textContent,
      html: htmlContent
    });
  }

  private async sendEmail(params: EmailParams): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('[EMAIL] Would send email:', {
        to: params.to,
        subject: params.subject,
        from: params.from
      });
      console.log('[EMAIL] Email content:', params.text);
      return true; // Return true for development/testing
    }

    try {
      await this.mailService.send({
        to: params.to,
        from: params.from as string,
        subject: params.subject,
        text: params.text || '',
        html: params.html || '',
      });
      
      console.log(`[EMAIL] Successfully sent email to ${params.to}`);
      return true;
    } catch (error) {
      console.error('[EMAIL] Failed to send email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();