export type EmailVerificationTemplateInput = {
  appName: string;
  recipientName: string;
  verificationUrl: string;
  expiresInHours: number;
  supportEmail?: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character];
  });
}

export function buildEmailVerificationTemplate(
  input: EmailVerificationTemplateInput,
) {
  const appName = escapeHtml(input.appName);
  const recipientName = escapeHtml(input.recipientName);
  const verificationUrl = escapeHtml(input.verificationUrl);
  const support = input.supportEmail
    ? `<p>Besoin d’aide ? Contactez ${escapeHtml(input.supportEmail)}.</p>`
    : '';

  return {
    subject: `Vérifiez votre adresse email — ${input.appName}`,
    html: `<!doctype html><html lang="fr"><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;color:#111"><main style="max-width:600px;margin:auto;background:#fff;border-radius:24px;padding:32px"><p style="font-weight:800;letter-spacing:.15em;text-transform:uppercase">${appName}</p><h1>Vérifiez votre adresse email</h1><p>Bonjour ${recipientName},</p><p>Confirmez que cette adresse email vous appartient afin d’activer votre compte client.</p><p style="margin:32px 0"><a href="${verificationUrl}" style="background:#111;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700">Vérifier mon adresse email</a></p><p>Ce lien expire dans ${input.expiresInHours} heures et ne peut être utilisé qu’une seule fois.</p><p>Si vous n’avez pas demandé cette création ou modification de compte, ignorez cet email.</p>${support}</main></body></html>`,
    text: `${input.appName}\n\nBonjour ${input.recipientName},\n\nVérifiez votre adresse email : ${input.verificationUrl}\n\nCe lien expire dans ${input.expiresInHours} heures et ne peut être utilisé qu’une seule fois.${input.supportEmail ? `\n\nBesoin d’aide ? ${input.supportEmail}` : ''}`,
  };
}
