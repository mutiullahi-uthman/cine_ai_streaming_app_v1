import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { FilmModule } from '../film/film.module';
import { IdentityModule } from '../identity/identity.module';
import { GetPremiereService } from './application/services/get-premiere.service';
import { PremiereLifecycleProcessor } from './application/services/premiere-lifecycle.processor';
import { SchedulePremiereService } from './application/services/schedule-premiere.service';
import { UpdatePremiereStatusService } from './application/services/update-premiere-status.service';
import { PremiereController } from './api/premiere.controller';
import { PremiereRepository } from './domain/repositories/premiere.repository';
import { PremiereLiveEventHandler } from './infrastructure/listeners/premiere-live-event.handler';
import { PrismaPremiereRepository } from './infrastructure/persistence/prisma-premiere.repository';

@Module({
  imports: [FilmModule, IdentityModule, PrismaModule],
  controllers: [PremiereController],
  providers: [
    GetPremiereService,
    PremiereLifecycleProcessor,
    PremiereLiveEventHandler,
    SchedulePremiereService,
    UpdatePremiereStatusService,
    {
      provide: PremiereRepository,
      useClass: PrismaPremiereRepository,
    },
  ],
  exports: [PremiereRepository],
})
export class PremiereModule {}
