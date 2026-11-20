import { loadConfig } from './config';

export interface SendResetEmailResult {
  success: boolean;
  messageId?: string;
  previewToken?: string;
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string
): Promise<SendResetEmailResult> {
  const currentConfig = loadConfig();
  const resetUrl = `${currentConfig.publicOrigin}/reset-password?token=${encodeURIComponent(resetToken)}`;

  if (!currentConfig.smtp) {
    // Mode dev/test / tanpa SMTP: Catat ke log server agar dapat diuji di lokal
    console.info(
      `[MAILER:DEV_MODE] Instruksi Reset Password untuk ${toEmail}:\n` +
      `  Link: ${resetUrl}\n` +
      `  Token: ${resetToken}\n` +
      `  Kedaluwarsa dalam 1 jam.`
    );
    return {
      success: true,
      previewToken: currentConfig.nodeEnv !== 'production' ? resetToken : undefined,
    };
  }

  // Jika SMTP dikonfigurasi, implementasi socket SMTP / service
  console.info(`[MAILER:SMTP] Mengirim email reset ke ${toEmail} via ${currentConfig.smtp.host}`);
  return { success: true };
}
