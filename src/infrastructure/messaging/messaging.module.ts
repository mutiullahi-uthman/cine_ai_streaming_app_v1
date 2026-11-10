import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from '../database/prisma.module';
import { EVENT_BUS } from '../../shared/contracts/event-bus.token';
import { EventEmitterEventBus } from './event-emitter-event-bus.service';
import { EventDeserializerService } from './event-deserializer.service';
import { OutboxPublisherService } from './outbox-publisher.service';
import { OutboxRepository } from './outbox.repository';
import { PrismaOutboxRepository } from './prisma-outbox.repository';
import { OutboxHealthMonitor } from './outbox-health-monitor.service';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
  ],
  providers: [
    EventEmitterEventBus,
    EventDeserializerService,
    OutboxPublisherService,
    OutboxHealthMonitor,
    {
      provide: OutboxRepository,
      useClass: PrismaOutboxRepository,
    },
    {
      provide: EVENT_BUS,
      useExisting: EventEmitterEventBus,
    },
  ],
  exports: [EVENT_BUS, OutboxRepository],
})
export class MessagingModule {}