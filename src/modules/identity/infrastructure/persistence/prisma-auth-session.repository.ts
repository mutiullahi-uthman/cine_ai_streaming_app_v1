import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AuthSession } from '../../domain/entities/auth-session.entity';
import { AuthSessionRepository } from '../../domain/repositories/auth-session.repository';

@Injectable()
export class PrismaAuthSessionRepository extends AuthSessionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(session: AuthSession): Promise<void> {
    await this.prisma.authSession.create({ data: session });
  }

  async findById(id: string): Promise<AuthSession | null> {
    return this.prisma.authSession.findUnique({ where: { id } });
  }

  async rotate(
    id: string,
    currentTokenHash: string,
    nextTokenHash: string,
    expiresAt: Date,
    now: Date,
  ): Promise<boolean> {
    const result = await this.prisma.authSession.updateMany({
      where: {
        id,
        refreshTokenHash: currentTokenHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        refreshTokenHash: nextTokenHash,
        expiresAt,
        updatedAt: now,
      },
    });
    return result.count === 1;
  }

  async revoke(
    id: string,
    currentTokenHash: string,
    now: Date,
  ): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: {
        id,
        refreshTokenHash: currentTokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
        updatedAt: now,
      },
    });
  }
}
