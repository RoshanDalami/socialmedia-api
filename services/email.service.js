import nodemailer from 'nodemailer';

let transporter = null;
let fromAddress = '';

const getTransporter = () => {
    if (transporter) return transporter;

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        return null;
    }

    fromAddress = SMTP_FROM || SMTP_USER;
    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    return transporter;
};

export const sendEmail = async ({ to, subject, text, html }) => {
    const mailer = getTransporter();
    if (!mailer) {
        console.warn('[Email] SMTP not configured, skipping email to:', to);
        return false;
    }

    try {
        await mailer.sendMail({
            from: fromAddress,
            to,
            subject,
            text,
            html,
        });
        console.log('[Email] Sent successfully to:', to);
        return true;
    } catch (error) {
        console.error('[Email] Failed to send:', error.message);
        return false;
    }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, resetToken, userName = 'User') => {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    const subject = 'NPIP - Password Reset Request';
    const text = `
Hello ${userName},

You have requested to reset your password for your NPIP account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email or contact support if you have concerns.

Best regards,
NPIP Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
        .button { display: inline-block; background: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .button:hover { background: #ea580c; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 8px; margin-top: 20px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset</h1>
        </div>
        <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>
            <p>You have requested to reset your password for your NPIP account.</p>
            <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset My Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 14px;">${resetUrl}</p>
            <div class="warning">
                ⏰ This link will expire in <strong>1 hour</strong>. If you did not request this reset, please ignore this email.
            </div>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} NPIP - Nepal's Public Figure Intelligence Portal</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    return sendEmail({ to: email, subject, text, html });
};

/**
 * Send alert notification email
 */
export const sendAlertEmail = async (email, alert, mentions, userName = 'User') => {
    const { name, type, threshold } = alert;
    const mentionCount = mentions.length;
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`;

    const subject = `🚨 NPIP Alert: ${name} - ${type === 'volume' ? 'Volume Spike' : 'Sentiment Shift'} Detected`;
    
    const mentionsList = mentions.slice(0, 5).map(m => 
        `- ${m.title || m.snippet?.substring(0, 80)}... (${m.source})`
    ).join('\n');

    const text = `
Hello ${userName},

Your alert "${name}" has been triggered!

Alert Type: ${type === 'volume' ? 'Volume Spike' : 'Sentiment Change'}
Threshold: ${threshold}
Mentions Found: ${mentionCount}

Recent Mentions:
${mentionsList}

View all mentions on your dashboard: ${dashboardUrl}

Best regards,
NPIP Team
    `.trim();

    const mentionsHtml = mentions.slice(0, 5).map(m => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                <strong>${m.title || 'Mention'}</strong>
                <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">${m.snippet?.substring(0, 100)}...</p>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                <span style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${m.source}</span>
            </td>
        </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
        .stat-box { background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .stat-number { font-size: 36px; font-weight: 700; color: #dc2626; }
        .stat-label { color: #6b7280; font-size: 14px; }
        .button { display: inline-block; background: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
        .mentions-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 Alert Triggered</h1>
        </div>
        <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Your alert <strong>"${name}"</strong> has been triggered!</p>
            
            <div class="stat-box">
                <div class="stat-number">${mentionCount}</div>
                <div class="stat-label">${type === 'volume' ? 'New Mentions Detected' : 'Sentiment Shift Detected'}</div>
                <div style="margin-top: 8px; font-size: 14px; color: #6b7280;">Threshold: ${threshold}</div>
            </div>

            <h3 style="margin-bottom: 8px;">Recent Mentions</h3>
            <table class="mentions-table">
                ${mentionsHtml}
            </table>

            <p style="text-align: center; margin-top: 30px;">
                <a href="${dashboardUrl}" class="button">View Dashboard</a>
            </p>
        </div>
        <div class="footer">
            <p>You're receiving this because you set up an alert in NPIP.</p>
            <p>© ${new Date().getFullYear()} NPIP - Nepal's Public Figure Intelligence Portal</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    return sendEmail({ to: email, subject, text, html });
};

/**
 * Send welcome email to new users
 */
export const sendWelcomeEmail = async (email, userName) => {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`;
    
    const subject = 'Welcome to NPIP - Nepal\'s Public Figure Intelligence Portal';
    const text = `
Welcome to NPIP, ${userName}!

Thank you for joining Nepal's Public Figure Intelligence Portal. You now have access to powerful tools for monitoring and analyzing public figures across Nepal.

Get started by:
1. Creating your first project
2. Setting up keyword tracking
3. Configuring alerts for important mentions

Visit your dashboard: ${dashboardUrl}

Best regards,
NPIP Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f97316, #ea580c); padding: 40px; border-radius: 12px 12px 0 0; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; }
        .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; }
        .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
        .step { display: flex; align-items: flex-start; margin: 20px 0; }
        .step-number { background: #f97316; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 12px; flex-shrink: 0; }
        .button { display: inline-block; background: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to NPIP!</h1>
            <p>Nepal's Public Figure Intelligence Portal</p>
        </div>
        <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Thank you for joining NPIP! You now have access to powerful tools for monitoring and analyzing public figures across Nepal.</p>
            
            <h3>Get Started</h3>
            <div class="step">
                <div class="step-number">1</div>
                <div>
                    <strong>Create Your First Project</strong>
                    <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">Set up tracking for a public figure or topic you want to monitor.</p>
                </div>
            </div>
            <div class="step">
                <div class="step-number">2</div>
                <div>
                    <strong>Configure Keywords</strong>
                    <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">Add relevant keywords to capture all mentions across platforms.</p>
                </div>
            </div>
            <div class="step">
                <div class="step-number">3</div>
                <div>
                    <strong>Set Up Alerts</strong>
                    <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">Get notified when there's a spike in mentions or sentiment changes.</p>
                </div>
            </div>

            <p style="text-align: center;">
                <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
            </p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} NPIP - Nepal's Public Figure Intelligence Portal</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    return sendEmail({ to: email, subject, text, html });
};

/**
 * Send daily/weekly digest email
 */
export const sendDigestEmail = async (email, userName, stats, period = 'daily') => {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`;
    
    const periodLabel = period === 'daily' ? 'Daily' : 'Weekly';
    const subject = `NPIP ${periodLabel} Digest - ${stats.totalMentions} new mentions`;
    
    const text = `
Hello ${userName},

Here's your ${periodLabel.toLowerCase()} digest from NPIP:

📊 Summary
- Total Mentions: ${stats.totalMentions}
- Positive: ${stats.positive}
- Neutral: ${stats.neutral}
- Negative: ${stats.negative}
- Estimated Reach: ${stats.reach?.toLocaleString() || 'N/A'}

Top Sources:
${stats.topSources?.map(s => `- ${s.name}: ${s.count} mentions`).join('\n') || 'No data'}

View detailed analytics: ${dashboardUrl}

Best regards,
NPIP Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 20px 0; }
        .stat-card { background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 28px; font-weight: 700; color: #1f2937; }
        .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
        .sentiment-bar { display: flex; height: 8px; border-radius: 4px; overflow: hidden; margin: 16px 0; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 ${periodLabel} Digest</h1>
        </div>
        <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Here's your ${periodLabel.toLowerCase()} summary from NPIP:</p>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${stats.totalMentions}</div>
                    <div class="stat-label">Total Mentions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.reach?.toLocaleString() || '—'}</div>
                    <div class="stat-label">Est. Reach</div>
                </div>
                <div class="stat-card" style="background: #dcfce7;">
                    <div class="stat-value" style="color: #16a34a;">${stats.positive}</div>
                    <div class="stat-label">Positive</div>
                </div>
                <div class="stat-card" style="background: #fee2e2;">
                    <div class="stat-value" style="color: #dc2626;">${stats.negative}</div>
                    <div class="stat-label">Negative</div>
                </div>
            </div>

            <div class="sentiment-bar">
                <div style="width: ${stats.totalMentions ? (stats.positive / stats.totalMentions * 100) : 0}%; background: #22c55e;"></div>
                <div style="width: ${stats.totalMentions ? (stats.neutral / stats.totalMentions * 100) : 0}%; background: #94a3b8;"></div>
                <div style="width: ${stats.totalMentions ? (stats.negative / stats.totalMentions * 100) : 0}%; background: #ef4444;"></div>
            </div>

            <p style="text-align: center; margin-top: 30px;">
                <a href="${dashboardUrl}" class="button">View Full Dashboard</a>
            </p>
        </div>
        <div class="footer">
            <p>You're receiving this digest based on your notification preferences.</p>
            <p>© ${new Date().getFullYear()} NPIP - Nepal's Public Figure Intelligence Portal</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    return sendEmail({ to: email, subject, text, html });
};
