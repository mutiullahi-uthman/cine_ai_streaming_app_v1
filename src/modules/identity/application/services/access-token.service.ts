import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto';

import { UserRole } from '../../domain/enums/user-role.enum';

export interface AccessTokenClaims {
  sub: string;
  role: UserRole;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AccessTokenService {
  private readonly secret: Buffer;
  private readonly issuer: string;
  private readonly audience: string;
  readonly expiresInSeconds: number;

  constructor(config: ConfigService) {
    const secret = config.getOrThrow<string>('JWT_SECRET');
    this.secret = Buffer.from(secret, 'utf8');
    if (this.secret.length < 32) {
      throw new Error('JWT_SECRET must contain at least 32 bytes.');
    }

    this.issuer = config.get<string>('JWT_ISSUER') ?? 'premier-night';
    this.audience = config.get<string>('JWT_AUDIENCE') ?? 'premier-night-api';
    this.expiresInSeconds = this.readPositiveInteger(
      config.get<string>('ACCESS_TOKEN_TTL_SECONDS'),
      900,
      'ACCESS_TOKEN_TTL_SECONDS',
    );
  }

  sign(userId: string, role: UserRole): string {
    const now = Math.floor(Date.now() / 1000);
    const header = this.encode({ alg: 'HS256', typ: 'JWT' });
    const payload = this.encode({
      sub: userId,
      role,
      iss: this.issuer,
      aud: this.audience,
      iat: now,
      exp: now + this.expiresInSeconds,
    });
    const signingInput = `${header}.${payload}`;
    const signature = this.signInput(signingInput).toString('base64url');
    return `${signingInput}.${signature}`;
  }

  verify(token: string): AccessTokenClaims {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid access token.');
    }

    const [headerValue, payloadValue, signatureValue] = parts;
    const expectedSignature = this.signInput(
      `${headerValue}.${payloadValue}`,
    );
    const actualSignature = Buffer.from(signatureValue, 'base64url');
    if (
      actualSignature.length !== expectedSignature.length ||
      !timingSafeEqual(actualSignature, expectedSignature)
    ) {
      throw new Error('Invalid access token signature.');
    }

    const header = this.decodeJson(headerValue);
    const payload = this.decodeJson(payloadValue);
    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      throw new Error('Invalid access token header.');
    }

    const now = Math.floor(Date.now() / 1000);
    if (
      typeof payload.sub !== 'string' ||
      !this.isUserRole(payload.role) ||
      payload.iss !== this.issuer ||
      payload.aud !== this.audience ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number' ||
      payload.exp <= now ||
      payload.iat > now + 60
    ) {
      throw new Error('Invalid or expired access token.');
    }

    return {
      sub: payload.sub,
      role: payload.role,
      iss: payload.iss,
      aud: payload.aud,
      iat: payload.iat,
      exp: payload.exp,
    };
  }

  private isUserRole(value: unknown): value is UserRole {
    return Object.values(UserRole).some((role) => role === value);
  }

  private signInput(input: string): Buffer {
    return createHmac('sha256', this.secret).update(input).digest();
  }

  private encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private decodeJson(value: string): Record<string, unknown> {
    const decoded: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    );
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
      throw new Error('Invalid access token payload.');
    }
    return decoded as Record<string, unknown>;
  }

  private readPositiveInteger(
    value: string | undefined,
    defaultValue: number,
    name: string,
  ): number {
    if (value === undefined) {
      return defaultValue;
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw new Error(`${name} must be a positive integer.`);
    }
    return parsed;
  }
}
