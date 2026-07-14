export type PasswordResetTemplateInput = {
  appName: string;
  recipientName: string;
  resetUrl: string;
  expiresInMinutes: number;
  supportEmail?: string;
};

export type MailTemplate = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildPasswordResetTemplate(
  input: PasswordResetTemplateInput,
): MailTemplate {
  const appName = escapeHtml(input.appName);
  const recipientName = escapeHtml(input.recipientName);
  const resetUrl = escapeHtml(input.resetUrl);
  const supportEmail = input.supportEmail
    ? escapeHtml(input.supportEmail)
    : undefined;

  const subject = `Réinitialisation de votre mot de passe ${input.appName}`;

  const supportLine = supportEmail
    ? `<p style="margin:24px 0 0;color:#6b7280;font-size:14px;line-height:22px;">Besoin d’aide ? Contactez-nous à <a href="mailto:${supportEmail}" style="color:#111827;">${supportEmail}</a>.</p>`
    : '';

  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Utilisez ce lien sécurisé pour choisir un nouveau mot de passe.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.06);">
            <tr>
              <td style="background:#0a0a0a;padding:28px 32px;color:#ffffff;">
                <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#d4d4d4;">Sécurité du compte</p>
                <h1 style="margin:14px 0 0;font-size:30px;line-height:38px;">${appName}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px;">
                <p style="margin:0 0 18px;font-size:17px;line-height:27px;">Bonjour ${recipientName},</p>
                <p style="margin:0 0 18px;color:#374151;font-size:16px;line-height:26px;">Une demande de réinitialisation de mot de passe a été effectuée pour votre compte.</p>
                <p style="margin:0 0 28px;color:#374151;font-size:16px;line-height:26px;">Le lien ci-dessous est personnel, utilisable une seule fois et expirera dans <strong>${input.expiresInMinutes} minutes</strong>.</p>
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="border-radius:999px;background:#0a0a0a;">
                      <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:15px 26px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Choisir un nouveau mot de passe</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:28px 0 8px;color:#6b7280;font-size:13px;line-height:21px;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
                <p style="margin:0;word-break:break-all;font-size:13px;line-height:21px;"><a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="color:#111827;">${resetUrl}</a></p>
                <p style="margin:28px 0 0;color:#6b7280;font-size:14px;line-height:22px;">Si vous n’êtes pas à l’origine de cette demande, ignorez cet email. Votre mot de passe actuel restera inchangé.</p>
                ${supportLine}
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e5e7eb;padding:20px 32px;color:#9ca3af;font-size:12px;line-height:19px;">Cet email automatique concerne la sécurité de votre compte ${appName}.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Bonjour ${input.recipientName},`,
    '',
    `Une demande de réinitialisation de mot de passe a été effectuée pour votre compte ${input.appName}.`,
    `Ce lien est utilisable une seule fois et expire dans ${input.expiresInMinutes} minutes :`,
    input.resetUrl,
    '',
    "Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.",
    input.supportEmail ? `Support : ${input.supportEmail}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject,
    html,
    text,
  };
}
