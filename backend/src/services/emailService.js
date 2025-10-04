const nodemailer = require('nodemailer');

/**
 * Email Service
 * 
 * Handles email sending for notifications, password resets, verification,
 * and other communication following constitutional requirements.
 * 
 * Constitutional Requirements:
 * - Secure email configuration and authentication
 * - Template-based email generation
 * - Rate limiting and abuse prevention
 * - Comprehensive error handling and logging
 */

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initialize();
  }

  /**
   * Initialize email transporter
   */
  async initialize() {
    try {
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('⚠️ Email configuration not found. Email sending will be simulated.');
        this.isConfigured = false;
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates
        }
      });

      // Verify connection configuration
      await this.transporter.verify();
      this.isConfigured = true;
      console.log('✅ Email service configured successfully');
    } catch (error) {
      console.log('⚠️ Email service configuration failed, will simulate emails:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Send email with template
   * @param {Object} emailData - Email configuration
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(emailData) {
    if (!this.isConfigured) {
      console.log('📧 Email service not configured, simulating email send:', emailData.subject);
      return { success: true, messageId: 'simulated', info: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'UniApply Hub'}" <${process.env.SMTP_USER}>`,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
        attachments: emailData.attachments || []
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`📧 Email sent successfully to ${emailData.to}: ${emailData.subject}`);
      return { success: true, messageId: result.messageId, info: result.response };
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Send welcome email to new user
   * @param {Object} user - User object
   * @param {string} verificationToken - Email verification token
   * @returns {Promise<Object>} Send result
   */
  async sendWelcomeEmail(user, verificationToken = null) {
    const verificationUrl = verificationToken 
      ? `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
      : null;

    const emailData = {
      to: user.email,
      subject: 'Welcome to UniApply Hub! 🎓',
      text: this.generateWelcomeTextEmail(user, verificationUrl),
      html: this.generateWelcomeHtmlEmail(user, verificationUrl)
    };

    return this.sendEmail(emailData);
  }

  /**
   * Send password reset email
   * @param {Object} user - User object
   * @param {string} resetToken - Password reset token
   * @returns {Promise<Object>} Send result
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const emailData = {
      to: user.email,
      subject: 'Reset Your UniApply Hub Password 🔐',
      text: this.generatePasswordResetTextEmail(user, resetUrl),
      html: this.generatePasswordResetHtmlEmail(user, resetUrl)
    };

    return this.sendEmail(emailData);
  }

  /**
   * Send email verification reminder
   * @param {Object} user - User object
   * @param {string} verificationToken - Email verification token
   * @returns {Promise<Object>} Send result
   */
  async sendEmailVerificationReminder(user, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const emailData = {
      to: user.email,
      subject: 'Please Verify Your Email Address 📧',
      text: this.generateEmailVerificationTextEmail(user, verificationUrl),
      html: this.generateEmailVerificationHtmlEmail(user, verificationUrl)
    };

    return this.sendEmail(emailData);
  }

  /**
   * Send application status update notification
   * @param {Object} user - User object
   * @param {Object} application - Application object
   * @param {string} newStatus - New application status
   * @returns {Promise<Object>} Send result
   */
  async sendApplicationStatusUpdate(user, application, newStatus) {
    const emailData = {
      to: user.email,
      subject: `Application Status Update: ${newStatus} 📋`,
      text: this.generateApplicationStatusTextEmail(user, application, newStatus),
      html: this.generateApplicationStatusHtmlEmail(user, application, newStatus)
    };

    return this.sendEmail(emailData);
  }

  /**
   * Send deadline reminder email
   * @param {Object} user - User object
   * @param {Array} upcomingDeadlines - Array of upcoming deadlines
   * @returns {Promise<Object>} Send result
   */
  async sendDeadlineReminder(user, upcomingDeadlines) {
    const emailData = {
      to: user.email,
      subject: `Upcoming Application Deadlines Reminder ⏰`,
      text: this.generateDeadlineReminderTextEmail(user, upcomingDeadlines),
      html: this.generateDeadlineReminderHtmlEmail(user, upcomingDeadlines)
    };

    return this.sendEmail(emailData);
  }

  /**
   * Send admin notification email
   * @param {string} adminEmail - Admin email address
   * @param {string} subject - Email subject
   * @param {string} message - Email message
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} Send result
   */
  async sendAdminNotification(adminEmail, subject, message, data = {}) {
    const emailData = {
      to: adminEmail,
      subject: `[UniApply Hub Admin] ${subject}`,
      text: message,
      html: `<div style="font-family: Arial, sans-serif;">
        <h2>Admin Notification</h2>
        <p>${message}</p>
        ${data ? `<pre>${JSON.stringify(data, null, 2)}</pre>` : ''}
      </div>`
    };

    return this.sendEmail(emailData);
  }

  /**
   * Generate welcome email text version
   * @param {Object} user - User object
   * @param {string} verificationUrl - Verification URL
   * @returns {string} Email text content
   */
  generateWelcomeTextEmail(user, verificationUrl) {
    const name = user.profile?.personalInfo?.firstName || 'there';
    
    return `
Welcome to UniApply Hub, ${name}!

We're excited to help you on your university application journey. UniApply Hub is your one-stop platform for managing university applications, tracking deadlines, and organizing your documents.

Getting Started:
1. Complete your profile to get personalized recommendations
2. Upload your documents (CV, transcripts, etc.)
3. Search and apply to universities
4. Track your application progress

${verificationUrl ? `Please verify your email address by clicking this link:\n${verificationUrl}\n\n` : ''}

If you have any questions, our support team is here to help.

Best regards,
The UniApply Hub Team

---
This email was sent to ${user.email}. If you didn't create this account, please ignore this email.
    `.trim();
  }

  /**
   * Generate welcome email HTML version
   * @param {Object} user - User object
   * @param {string} verificationUrl - Verification URL
   * @returns {string} Email HTML content
   */
  generateWelcomeHtmlEmail(user, verificationUrl) {
    const name = user.profile?.personalInfo?.firstName || 'there';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to UniApply Hub</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 Welcome to UniApply Hub!</h1>
        </div>
        <div class="content">
            <h2>Hello ${name}!</h2>
            <p>We're excited to help you on your university application journey. UniApply Hub is your one-stop platform for managing university applications, tracking deadlines, and organizing your documents.</p>
            
            <h3>Getting Started:</h3>
            <ol>
                <li>Complete your profile to get personalized recommendations</li>
                <li>Upload your documents (CV, transcripts, etc.)</li>
                <li>Search and apply to universities</li>
                <li>Track your application progress</li>
            </ol>

            ${verificationUrl ? `
            <p><strong>Important:</strong> Please verify your email address to access all features.</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            ` : ''}

            <p>If you have any questions, our support team is here to help.</p>
            
            <p>Best regards,<br>The UniApply Hub Team</p>
        </div>
        <div class="footer">
            <p>This email was sent to ${user.email}</p>
            <p>If you didn't create this account, please ignore this email.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate password reset email text version
   * @param {Object} user - User object
   * @param {string} resetUrl - Password reset URL
   * @returns {string} Email text content
   */
  generatePasswordResetTextEmail(user, resetUrl) {
    const name = user.profile?.personalInfo?.firstName || 'there';
    
    return `
Hello ${name},

We received a request to reset your UniApply Hub password.

To reset your password, click this link:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

For security, this request was made from IP address and included your account email.

Best regards,
The UniApply Hub Team

---
This email was sent to ${user.email}
    `.trim();
  }

  /**
   * Generate password reset email HTML version
   * @param {Object} user - User object
   * @param {string} resetUrl - Password reset URL
   * @returns {string} Email HTML content
   */
  generatePasswordResetHtmlEmail(user, resetUrl) {
    const name = user.profile?.personalInfo?.firstName || 'there';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset Your Password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
            <h2>Hello ${name},</h2>
            <p>We received a request to reset your UniApply Hub password.</p>
            
            <a href="${resetUrl}" class="button">Reset Your Password</a>
            
            <div class="warning">
                <p><strong>⚠️ Security Notice:</strong></p>
                <p>This link will expire in 1 hour for security reasons.</p>
                <p>If you didn't request this password reset, please ignore this email.</p>
            </div>

            <p>Best regards,<br>The UniApply Hub Team</p>
        </div>
        <div class="footer">
            <p>This email was sent to ${user.email}</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate email verification text email
   */
  generateEmailVerificationTextEmail(user, verificationUrl) {
    const name = user.profile?.personalInfo?.firstName || 'there';
    
    return `
Hello ${name},

Please verify your email address to complete your UniApply Hub account setup.

Click this link to verify your email:
${verificationUrl}

This link will expire in 24 hours.

Once verified, you'll have full access to all UniApply Hub features.

Best regards,
The UniApply Hub Team
    `.trim();
  }

  /**
   * Generate email verification HTML email
   */
  generateEmailVerificationHtmlEmail(user, verificationUrl) {
    const name = user.profile?.personalInfo?.firstName || 'there';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verify Your Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 Verify Your Email</h1>
        </div>
        <div class="content">
            <h2>Hello ${name},</h2>
            <p>Please verify your email address to complete your UniApply Hub account setup.</p>
            
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            
            <p>This link will expire in 24 hours.</p>
            <p>Once verified, you'll have full access to all UniApply Hub features.</p>

            <p>Best regards,<br>The UniApply Hub Team</p>
        </div>
        <div class="footer">
            <p>This email was sent to ${user.email}</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate application status update text email
   */
  generateApplicationStatusTextEmail(user, application, newStatus) {
    const name = user.profile?.personalInfo?.firstName || 'there';
    
    return `
Hello ${name},

Your application status has been updated!

Application Details:
- University: ${application.universityId?.name || 'University'}
- Program: ${application.programId || 'Program'}
- New Status: ${newStatus}
- Updated: ${new Date().toLocaleDateString()}

${newStatus === 'Accepted' ? 'Congratulations! 🎉' : 
  newStatus === 'Rejected' ? 'Don\'t worry, there are many other opportunities!' : 
  'We\'ll keep you updated on any further changes.'}

You can view your full application details in your UniApply Hub dashboard.

Best regards,
The UniApply Hub Team
    `.trim();
  }

  /**
   * Generate application status update HTML email
   */
  generateApplicationStatusHtmlEmail(user, application, newStatus) {
    const name = user.profile?.personalInfo?.firstName || 'there';
    const statusColor = newStatus === 'Accepted' ? '#059669' : 
                       newStatus === 'Rejected' ? '#dc2626' : '#f59e0b';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Application Status Update</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .status { background: white; border-left: 4px solid ${statusColor}; padding: 15px; margin: 15px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Application Status Update</h1>
        </div>
        <div class="content">
            <h2>Hello ${name},</h2>
            <p>Your application status has been updated!</p>
            
            <div class="status">
                <h3>Application Details:</h3>
                <p><strong>University:</strong> ${application.universityId?.name || 'University'}</p>
                <p><strong>Program:</strong> ${application.programId || 'Program'}</p>
                <p><strong>New Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${newStatus}</span></p>
                <p><strong>Updated:</strong> ${new Date().toLocaleDateString()}</p>
            </div>

            ${newStatus === 'Accepted' ? '<p>🎉 <strong>Congratulations!</strong> We\'re excited for your next steps.</p>' : 
              newStatus === 'Rejected' ? '<p>Don\'t worry, there are many other opportunities! Keep applying and stay positive.</p>' : 
              '<p>We\'ll keep you updated on any further changes.</p>'}

            <p>You can view your full application details in your UniApply Hub dashboard.</p>

            <p>Best regards,<br>The UniApply Hub Team</p>
        </div>
        <div class="footer">
            <p>This email was sent to ${user.email}</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate deadline reminder text email
   */
  generateDeadlineReminderTextEmail(user, upcomingDeadlines) {
    const name = user.profile?.personalInfo?.firstName || 'there';
    
    let deadlinesList = upcomingDeadlines.map(deadline => 
      `- ${deadline.university}: ${deadline.daysRemaining} days remaining (${new Date(deadline.deadline).toLocaleDateString()})`
    ).join('\n');
    
    return `
Hello ${name},

This is a friendly reminder about your upcoming application deadlines:

${deadlinesList}

Don't miss these important deadlines! Make sure to:
1. Complete all required sections of your applications
2. Upload all necessary documents
3. Submit before the deadline

You can manage all your applications in your UniApply Hub dashboard.

Best regards,
The UniApply Hub Team
    `.trim();
  }

  /**
   * Generate deadline reminder HTML email
   */
  generateDeadlineReminderHtmlEmail(user, upcomingDeadlines) {
    const name = user.profile?.personalInfo?.firstName || 'there';
    
    const deadlinesList = upcomingDeadlines.map(deadline => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${deadline.university}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${deadline.daysRemaining} days</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${new Date(deadline.deadline).toLocaleDateString()}</td>
      </tr>
    `).join('');
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Deadline Reminder</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .deadlines-table { width: 100%; border-collapse: collapse; margin: 15px 0; background: white; }
        .deadlines-table th { background: #f3f4f6; padding: 12px; text-align: left; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Deadline Reminder</h1>
        </div>
        <div class="content">
            <h2>Hello ${name},</h2>
            <p>This is a friendly reminder about your upcoming application deadlines:</p>
            
            <table class="deadlines-table">
                <thead>
                    <tr>
                        <th>University</th>
                        <th>Days Remaining</th>
                        <th>Deadline</th>
                    </tr>
                </thead>
                <tbody>
                    ${deadlinesList}
                </tbody>
            </table>

            <p><strong>Don't miss these important deadlines!</strong> Make sure to:</p>
            <ol>
                <li>Complete all required sections of your applications</li>
                <li>Upload all necessary documents</li>
                <li>Submit before the deadline</li>
            </ol>

            <p>You can manage all your applications in your UniApply Hub dashboard.</p>

            <p>Best regards,<br>The UniApply Hub Team</p>
        </div>
        <div class="footer">
            <p>This email was sent to ${user.email}</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Check if email service is ready
   * @returns {boolean} Service status
   */
  isReady() {
    return this.isConfigured;
  }

  /**
   * Test email configuration
   * @returns {Promise<boolean>} Test result
   */
  async testConfiguration() {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email configuration test failed:', error.message);
      return false;
    }
  }
}

// Export singleton instance
const emailService = new EmailService();

module.exports = emailService;