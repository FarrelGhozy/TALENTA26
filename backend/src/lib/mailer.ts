import { loadConfig } from './config';
import nodemailer from 'nodemailer';

export interface SendResetEmailResult {
  success: boolean;
  messageId?: string;
  previewToken?: string;
}

interface ResetMailTransport {
  sendMail(message: {
    from: string;
    to: string;
    subject: string;
    text: string;
  }): Promise<{ messageId: string }>;
}

type ResetMailTransportFactory = (options: {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
}) => ResetMailTransport;

export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string,
  createTransport: ResetMailTransportFactory = nodemailer.createTransport
): Promise<SendResetEmailResult> {
  const currentConfig = loadConfig();
  const resetUrl = `${currentConfig.publicOrigin}/reset-password?token=${encodeURIComponent(resetToken)}`;

  if (!currentConfig.smtp) {
    if (currentConfig.nodeEnv === 'production') {
      throw new Error('Layanan email pemulihan akun belum dikonfigurasi');
    }
    return {
      success: true,
      previewToken: resetToken,
    };
  }

  const transport = createTransport({
    host: currentConfig.smtp.host,
    port: currentConfig.smtp.port,
    secure: currentConfig.smtp.secure,
    auth: {
      user: currentConfig.smtp.user,
      pass: currentConfig.smtp.pass,
    },
  });
  const result = await transport.sendMail({
    from: currentConfig.smtp.from,
    to: toEmail,
    subject: 'Pemulihan kata sandi TALENTA',
    text: `Gunakan tautan berikut untuk membuat kata sandi baru. Tautan berlaku selama 1 jam:\n\n${resetUrl}\n\nJika Anda tidak meminta perubahan ini, abaikan pesan ini.`,
  });
  return { success: true, messageId: result.messageId };
}
