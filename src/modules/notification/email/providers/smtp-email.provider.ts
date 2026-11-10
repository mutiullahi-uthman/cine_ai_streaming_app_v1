import {
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';

import { EmailMessage, EmailProvider } from '../email-provider.interface';

@Injectable()
export class SmtpEmailProvider extends EmailProvider implements OnModuleDestroy {
  private transporter?: Transporter;
  private fromAddress?: string;

  constructor(private readonly config: ConfigService) {
    super();
  }

  async send(message: EmailMessage): Promise<void> {
    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: this.fromAddress,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }

  onModuleDestroy(): void {
    this.transporter?.close();
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const portValue = this.config.get<string>('SMTP_PORT');
    const from = this.config.get<string>('SMTP_FROM')?.trim();
    if (!host || !from) {
      throw new Error('SMTP_HOST and SMTP_FROM must be configured for email delivery.');
    }

    const port = portValue === undefined ? 587 : Number(portValue);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('SMTP_PORT must be a valid TCP port.');
    }

    const username = this.config.get<string>('SMTP_USER');
    const password = this.config.get<string>('SMTP_PASSWORD');
    if ((username && !password) || (!username && password)) {
      throw new Error('SMTP_USER and SMTP_PASSWORD must be configured together.');
    }

    const secureValue = this.config.get<string>('SMTP_SECURE');
    const secure = secureValue === undefined
      ? port === 465
      : secureValue === 'true';
    if (
      secureValue !== undefined &&
      secureValue !== 'true' &&
      secureValue !== 'false'
    ) {
      throw new Error('SMTP_SECURE must be either true or false.');
    }

    const options = {
      host,
      port,
      secure,
      requireTLS: !secure,
      tls: { minVersion: 'TLSv1.2' as const },
      ...(username && password
        ? { auth: { user: username, pass: password } }
        : {}),
    };
    this.transporter = createTransport(options);
    this.fromAddress = from;
    return this.transporter;
  }
}
