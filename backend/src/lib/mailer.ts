import { loadConfig } from './config';
import nodemailer from 'nodemailer';

export class MailerUnavailableError extends Error {
  constructor(message = 'Layanan email pemulihan akun belum dikonfigurasi') {
    super(message);
    this.name = 'MailerUnavailableError';
  }
}

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
  close?: () => void;
}

type ResetMailTransportFactory = (options: {
  host: string;
  port: number;
  secure: boolean;
  connectionTimeout: number;
  greetingTimeout: number;
  socketTimeout: number;
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
      throw new MailerUnavailableError('Layanan email pemulihan akun belum dikonfigurasi');
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
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: {
      user: currentConfig.smtp.user,
      pass: currentConfig.smtp.pass,
    },
  });

  try {
    const result = await transport.sendMail({
      from: currentConfig.smtp.from,
      to: toEmail,
      subject: 'Pemulihan kata sandi UNIDA Student Championship (USC)',
      text: `Gunakan tautan berikut untuk membuat kata sandi baru akun UNIDA Student Championship (USC) Anda. Tautan berlaku selama 1 jam:\n\n${resetUrl}\n\nJika Anda tidak meminta perubahan ini, abaikan pesan ini.`,
    });
    return { success: true, messageId: result.messageId };
  } finally {
    transport.close?.();
  }
}
