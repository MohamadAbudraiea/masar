import { config } from '../config.js';

/**
 * Shared HTML email layout adhering to 07-NOTIFICATIONS-AND-EMAILS.md §5:
 * Navy header with Masar wordmark, white body, amber primary button,
 * key facts list, secondary link, and small footer with support email and settings link.
 */
export function renderEmailLayout({
  previewText = '',
  headline,
  facts = [], // [{ label, value }]
  primaryButton = null, // { text, url }
  secondaryLink = null, // { text, url }
  footerNote = null,
  recipientUserId = null,
  recipientRole = null,
}) {
  const supportEmail = config.email?.supportEmail || 'support@yourdomain.com';
  const settingsUrl = recipientRole
    ? `${config.frontendUrl}/${recipientRole}/settings`
    : `${config.frontendUrl}/settings`;

  const factsHtml = facts
    .filter((f) => f && f.label && f.value)
    .map(
      (f) => `
      <tr>
        <td style="padding: 8px 12px; font-size: 13px; color: #64748b; font-weight: 600; width: 38%; vertical-align: top; border-bottom: 1px solid #f1f5f9;">
          ${escapeHtml(f.label)}
        </td>
        <td style="padding: 8px 12px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f1f5f9;">
          ${escapeHtml(String(f.value))}
        </td>
      </tr>`
    )
    .join('');

  const primaryBtnHtml = primaryButton
    ? `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 16px 0;">
      <tr>
        <td align="center">
          <a href="${primaryButton.url}" target="_blank" style="display: inline-block; background-color: #f59e0b; color: #0f172a; font-size: 14px; font-weight: 800; text-decoration: none; padding: 12px 28px; border-radius: 12px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); text-align: center;">
            ${escapeHtml(primaryButton.text)} &rarr;
          </a>
        </td>
      </tr>
    </table>`
    : '';

  const secondaryLinkHtml = secondaryLink
    ? `
    <div style="margin-top: 10px; text-align: center;">
      <a href="${secondaryLink.url}" target="_blank" style="font-size: 12px; color: #64748b; text-decoration: underline; font-weight: 600;">
        ${escapeHtml(secondaryLink.text)}
      </a>
    </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(headline)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    img { border: 0; }
  </style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc;">
  <!-- Preview Text (Hidden in body) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${escapeHtml(previewText || headline)}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Navy Header Bar -->
    <tr>
      <td style="background-color: #0f172a; padding: 22px 32px; text-align: left;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td>
              <div style="display: inline-block; vertical-align: middle;">
                <span style="font-size: 20px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">MASAR</span>
                <span style="font-size: 14px; font-weight: 700; color: #f59e0b; margin-left: 6px;">| مسار</span>
              </div>
              <div style="font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">
                Modern Freight &amp; SafePay Escrow
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 32px 32px 24px 32px;">
        <h1 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 800; color: #0f172a; line-height: 1.35;">
          ${escapeHtml(headline)}
        </h1>

        ${
          facts.length > 0
            ? `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 16px; margin-bottom: 8px;">
          ${factsHtml}
        </table>`
            : ''
        }

        ${primaryBtnHtml}
        ${secondaryLinkHtml}

        ${
          footerNote
            ? `
        <p style="margin: 20px 0 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
          ${escapeHtml(footerNote)}
        </p>`
            : ''
        }
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f1f5f9; padding: 18px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; line-height: 1.6;">
        <div>Need assistance? Contact our team at <a href="mailto:${supportEmail}" style="color: #0f172a; font-weight: 600; text-decoration: underline;">${supportEmail}</a></div>
        <div style="margin-top: 4px;">
          All deliveries backed by SafePay Escrow (Permanent Jordan Standard Time UTC+3).
          &bull; <a href="${settingsUrl}" style="color: #64748b; text-decoration: underline;">Manage notifications</a>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Auto-generate plain-text fallback
  const plainText = [
    `MASAR | مسار - Modern Freight & SafePay Escrow`,
    `--------------------------------------------`,
    headline,
    ``,
    ...facts.map((f) => `${f.label}: ${f.value}`),
    ``,
    primaryButton ? `${primaryButton.text}: ${primaryButton.url}` : '',
    secondaryLink ? `${secondaryLink.text}: ${secondaryLink.url}` : '',
    ``,
    footerNote || '',
    `--------------------------------------------`,
    `Support: ${supportEmail}`,
    `Manage notifications: ${settingsUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { html, text: plainText };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

