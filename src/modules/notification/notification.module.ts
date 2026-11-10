import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { FilmModule } from '../film/film.module';
import { IdentityModule } from '../identity/identity.module';
import { MediaModule } from '../media/media.module';
import { ProcessingModule } from '../processing/processing.module';
import { UploadModule } from '../upload/upload.module';
import { EMAIL_PROVIDER } from './email/email-provider.interface';
import { SendWorkflowNotificationService } from './application/services/send-workflow-notification.service';
import { SmtpEmailProvider } from './email/providers/smtp-email.provider';
import { WorkflowNotificationListener } from './infrastructure/listeners/workflow-notification.listener';
import { BullMqModule } from '../../infrastructure/queue/bullmq.module';

@Module({
  imports: [
    ConfigModule,
    FilmModule,
    IdentityModule,
    MediaModule,
    ProcessingModule,
    UploadModule,
    BullMqModule,
  ],
  providers: [
    SendWorkflowNotificationService,
    WorkflowNotificationListener,
    SmtpEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      useExisting: SmtpEmailProvider,
    },
  ],
  exports: [SendWorkflowNotificationService],
})
export class NotificationModule {}
