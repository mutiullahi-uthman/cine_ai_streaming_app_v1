import {
  Global,
  Module,
} from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';

import {
  STORAGE_PROVIDER,
  OBJECT_KEY_FACTORY,
} from './storage.constants';

import { S3StorageProvider } from './providers/s3-storage.provider';

import { DefaultObjectKeyFactory } from './factories/object-key.factory';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],

  providers: [
    S3StorageProvider,
    DefaultObjectKeyFactory,

    {
      provide: STORAGE_PROVIDER,
      useExisting:
        S3StorageProvider,
    },

    {
      provide: OBJECT_KEY_FACTORY,
      useExisting:
        DefaultObjectKeyFactory,
    },
  ],

  exports: [
    STORAGE_PROVIDER,
    OBJECT_KEY_FACTORY,
  ],
})
export class StorageModule {}