import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AiModule } from './ai/ai.module.js';
import { AuthModule } from './auth/auth.module.js';
import { validateEnvironment } from './common/config/env.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { ReleasesModule } from './releases/releases.module.js';
import { MovementsModule } from './movements/movements.module.js';
import { RecordsModule } from './records/records.module.js';
import { WodsModule } from './wods/wods.module.js';
import { WorkoutsModule } from './workouts/workouts.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    // Límite general; los endpoints de autenticación declaran uno más estricto.
    // Desactivado sólo en tests, que crean muchos usuarios desde la misma IP.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    ProfileModule,
    MovementsModule,
    RecordsModule,
    WodsModule,
    WorkoutsModule,
    ReleasesModule,
    AiModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
