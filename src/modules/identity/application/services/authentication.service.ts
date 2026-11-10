import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHash,
  randomBytes,
  randomUUID,
} from 'node:crypto';

import { AuthSession } from '../../domain/entities/auth-session.entity';
import { User } from '../../domain/entities/user.entity';
import { AuthSessionRepository } from '../../domain/repositories/auth-session.repository';
import { UserRepository } from '../../domain/repositories/user.repository';
import { AccessTokenService } from './access-token.service';
import { PasswordHasher } from './password-hasher.service';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresAt: Date;
  user: {
    id: string;
    email: string;
    role: User['role'];
  };
}

@Injectable()
export class AuthenticationService {
  private readonly refreshTtlSeconds: number;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly accessTokens: AccessTokenService,
    config: ConfigService,
  ) {
    this.refreshTtlSeconds = this.readPositiveInteger(
      config.get<string>('REFRESH_TOKEN_TTL_SECONDS'),
      60 * 60 * 24 * 30,
      'REFRESH_TOKEN_TTL_SECONDS',
    );
  }

  async register(email: string, password: string): Promise<TokenPair> {
    const normalizedEmail = email.trim().toLowerCase();
    if (await this.userRepository.findByEmail(normalizedEmail)) {
      throw new ConflictException('An account with this email already exists.');
    }

    const user = User.registerViewer(
      normalizedEmail,
      await this.passwordHasher.hash(password),
    );

    try {
      await this.userRepository.create(user);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists.',
        );
      }
      throw error;
    }

    return this.createSession(user);
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.userRepository.findByEmail(
      email.trim().toLowerCase(),
    );
    if (
      !user ||
      !(await this.passwordHasher.verify(password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.createSession(user);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const { sessionId } = this.parseRefreshToken(refreshToken);
    const session = await this.authSessionRepository.findById(sessionId);
    if (!session) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const nextRefreshToken = this.createRefreshToken(sessionId);
    const now = new Date();
    const refreshExpiresAt = this.refreshExpiry(now);
    const rotated = await this.authSessionRepository.rotate(
      sessionId,
      this.hashToken(refreshToken),
      this.hashToken(nextRefreshToken),
      refreshExpiresAt,
      now,
    );
    if (!rotated) {
      throw new UnauthorizedException(
        'Refresh token is expired, revoked, or has already been used.',
      );
    }

    return this.tokenPair(user, nextRefreshToken, refreshExpiresAt);
  }

  async logout(refreshToken: string): Promise<void> {
    const { sessionId } = this.parseRefreshToken(refreshToken);
    await this.authSessionRepository.revoke(
      sessionId,
      this.hashToken(refreshToken),
      new Date(),
    );
  }

  private async createSession(user: User): Promise<TokenPair> {
    const sessionId = randomUUID();
    const refreshToken = this.createRefreshToken(sessionId);
    const now = new Date();
    const refreshExpiresAt = this.refreshExpiry(now);
    const session: AuthSession = {
      id: sessionId,
      userId: user.id,
      refreshTokenHash: this.hashToken(refreshToken),
      expiresAt: refreshExpiresAt,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.authSessionRepository.create(session);
    return this.tokenPair(user, refreshToken, refreshExpiresAt);
  }

  private tokenPair(
    user: User,
    refreshToken: string,
    refreshExpiresAt: Date,
  ): TokenPair {
    return {
      accessToken: this.accessTokens.sign(user.id, user.role),
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.accessTokens.expiresInSeconds,
      refreshExpiresAt,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  private createRefreshToken(sessionId: string): string {
    return `${sessionId}.${randomBytes(32).toString('base64url')}`;
  }

  private parseRefreshToken(token: string): { sessionId: string } {
    const separator = token.indexOf('.');
    const sessionId = token.slice(0, separator);
    const secret = token.slice(separator + 1);
    if (
      separator < 1 ||
      !/^[0-9a-f-]{36}$/i.test(sessionId) ||
      !/^[A-Za-z0-9_-]{43}$/.test(secret)
    ) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    return { sessionId };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshExpiry(now: Date): Date {
    return new Date(now.getTime() + this.refreshTtlSeconds * 1000);
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
