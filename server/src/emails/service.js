import { Resend } from 'resend';
import { config } from '../config.js';
import { templates } from './templates.js';

let resendClient = null;

function getResendClient() {
  if (!resendClient && config.email.apiKey) {
    resendClient = new Resend(config.email.apiKey);
  }
  return resendClient;
}

// Account emails that ignore the email_notifications toggle per 07 §4
const MANDATORY_ACCOUNT_TEMPLATES = new Set([
  'SignupReceived',
  'AccountApproved',
  'AccountRejected',
  'AccountCreatedByAdmin',
]);

/**
 * Sends a transactional email using the Resend service and registered templates.
 * 
 * @param {Object} options
 * @param {string | string[]} options.to - recipient email address(es)
 * @param {string} options.templateKey - one of the 15 keys from templates.js
 * @param {Object} [options.data] - data passed into the template generator
 * @param {boolean} [options.emailNotificationsEnabled=true] - user preference toggle
 */
export async function sendEmail({
  to,
  templateKey,
  data = {},
  emailNotificationsEnabled = true,
}) {
  try {
    if (!to || (Array.isArray(to) && to.length === 0)) {
      return { success: false, reason: 'NO_RECIPIENT' };
    }

    const templateFn = templates[templateKey];
    if (!templateFn) {
      console.warn(`[Email Service] Unknown templateKey: "${templateKey}"`);
      return { success: false, reason: 'UNKNOWN_TEMPLATE' };
    }

    // Check notification toggle unless this is a mandatory account lifecycle email
    if (!emailNotificationsEnabled && !MANDATORY_ACCOUNT_TEMPLATES.has(templateKey)) {
      return { success: false, reason: 'OPTED_OUT' };
    }

    const rendered = templateFn(data);
    let recipientAddresses = Array.isArray(to) ? to.filter(Boolean) : [to];
    let subject = rendered.subject;

    // Handle test redirect mode per 07 §4
    if (config.email.redirectTo) {
      const originalTo = recipientAddresses.join(', ');
      subject = `[TEST → ${originalTo}] ${subject}`;
      recipientAddresses = [config.email.redirectTo];
    }

    const resend = getResendClient();

    // If Resend API key is not configured, simulate delivery cleanly
    if (!resend) {
      console.log(`[Email Mock] Simulated delivery: "${templateKey}" to ${recipientAddresses.join(', ')} | Subject: ${subject}`);
      return {
        success: true,
        simulated: true,
        subject,
        to: recipientAddresses,
        html: rendered.html,
        text: rendered.text,
      };
    }

    const res = await resend.emails.send({
      from: config.email.from,
      to: recipientAddresses,
      subject,
      html: rendered.html,
      text: rendered.text,
    });

    return {
      success: true,
      id: res.data?.id,
      simulated: false,
      subject,
    };
  } catch (err) {
    // Non-blocking: email failures must never break user transactions (07 §1)
    console.error(`[Email Service Error] Failed to send "${templateKey}":`, err.message || err);
    return { success: false, error: err.message };
  }
}

