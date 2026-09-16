import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../common/config/env.js';
import { ReleasesController } from './releases.controller.js';
import { ReleasesService } from './releases.service.js';
import { defaultReleasesRoot, LocalReleaseStorage } from './storage/local-release-storage.js';
import { ReleaseStorage } from './storage/release-storage.js';

@Module({
  controllers: [ReleasesController],
  providers: [
    ReleasesService,
    {
      // Único punto a cambiar para usar S3/R2: otra implementación de ReleaseStorage.
      provide: ReleaseStorage,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new LocalReleaseStorage(
          config.get('RELEASES_STORAGE_DIR', { infer: true }) ?? defaultReleasesRoot(),
        ),
    },
  ],
})
export class ReleasesModule {}
