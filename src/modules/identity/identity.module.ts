import { Module } from '@nestjs/common';
import { Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { FilmModule } from '../film/film.module';
import { MediaModule } from '../media/media.module';
import { ProcessingModule } from '../processing/processing.module';
import { UploadModule } from '../upload/upload.module';
import { AuthenticationService } from './application/services/authentication.service';
import { AccessTokenService } from './application/services/access-token.service';
import { PasswordHasher } from './application/services/password-hasher.service';
import { ResourceAuthorizationService } from './application/services/resource-authorization.service';
import { AuthController } from './api/auth.controller';
import { AuthSessionRepository } from './domain/repositories/auth-session.repository';
import { UserRepository } from './domain/repositories/user.repository';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from './infrastructure/guards/roles.guard';
import { PrismaAuthSessionRepository } from './infrastructure/persistence/prisma-auth-session.repository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';

@Global()
@Module({
  imports: [
    ConfigModule,
    FilmModule,
    MediaModule,
    ProcessingModule,
    PrismaModule,
    UploadModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthenticationService,
    AccessTokenService,
    PasswordHasher,
    ResourceAuthorizationService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: APP_GUARD,
      useExisting: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: RolesGuard,
    },
    {
      provide: UserRepository,
      useClass: PrismaUserRepository,
    },
    {
      provide: AuthSessionRepository,
      useClass: PrismaAuthSessionRepository,
    },
  ],
  exports: [ResourceAuthorizationService, UserRepository],
})
export class IdentityModule {}
