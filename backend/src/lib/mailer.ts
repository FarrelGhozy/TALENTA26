import { isSmtpConfigured, loadConfig } from './config';
import { logger } from './logger';
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

  if (!isSmtpConfigured(currentConfig)) {
    if (currentConfig.nodeEnv === 'production') {
      logger.error(
        'mailer',
        'Pengiriman email pemulihan kata sandi gagal: SMTP produksi belum dikonfigurasi atau masih placeholder (K-13).'
      );
      throw new MailerUnavailableError(
        'Layanan email pemulihan akun belum dikonfigurasi atau masih menggunakan placeholder.'
      );
    }
    return {
      success: true,
      previewToken: resetToken,
    };
  }

  const smtp = currentConfig.smtp!;
  const transport = createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  try {
    const result = await transport.sendMail({
      from: smtp.from,
      to: toEmail,
      subject: 'Pemulihan kata sandi UNIDA Student Championship (USC)',
      text: `Gunakan tautan berikut untuk membuat kata sandi baru akun UNIDA Student Championship (USC) Anda. Tautan berlaku selama 1 jam:\n\n${resetUrl}\n\nJika Anda tidak meminta perubahan ini, abaikan pesan ini.`,
    });
    return { success: true, messageId: result.messageId };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error('mailer', 'Gagal mengirim email pemulihan kata sandi melalui SMTP.', {
      host: smtp.host,
      port: smtp.port,
      error: errMsg,
    });
    throw new MailerUnavailableError(
      'Layanan email pemulihan akun gagal terhubung ke server SMTP.'
    );
  } finally {
    transport.close?.();
  }
}
