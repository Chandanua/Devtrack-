import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

let resendClient: Resend | null = null;
let hasWarnedMissingKey = false;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (!hasWarnedMissingKey) {
      console.warn('[email] RESEND_API_KEY not set, logging instead of sending');
      hasWarnedMissingKey = true;
    }
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const resend = getResendClient();
  const from = process.env.EMAIL_FROM || 'DevTrack <onboarding@resend.dev>';

  if (!resend) {
    console.log('[email] Would send email:', { from, to, subject, html });
    return { success: true, id: 'mock-email-id' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[email] Failed to send email via Resend:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('[email] Unexpected error sending email:', err);
    return { success: false, error: err?.message || 'Failed to send email' };
  }
}
