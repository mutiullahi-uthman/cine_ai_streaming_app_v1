import { AuthSession } from '../entities/auth-session.entity';

export abstract class AuthSessionRepository {
  abstract create(session: AuthSession): Promise<void>;
  abstract findById(id: string): Promise<AuthSession | null>;
  abstract rotate(
    id: string,
    currentTokenHash: string,
    nextTokenHash: string,
    expiresAt: Date,
    now: Date,
  ): Promise<boolean>;
  abstract revoke(
    id: string,
    currentTokenHash: string,
    now: Date,
  ): Promise<void>;
}
