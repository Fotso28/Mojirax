import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { FirebaseModule } from './firebase/firebase.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { InteractionsModule } from './interactions/interactions.module';
import { SearchModule } from './search/search.module';
import { ApplicationsModule } from './applications/applications.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DocumentsModule } from './documents/documents.module';
import { MatchingModule } from './matching/matching.module';
import { UnlockModule } from './unlock/unlock.module';
import { AiModule } from './ai/ai.module';
import { ModerationModule } from './moderation/moderation.module';
import { AdminModule } from './admin/admin.module';
import { AdsModule } from './ads/ads.module';
import { AiConfigModule } from './ai-config/ai-config.module';
import { ScheduleModule } from '@nestjs/schedule';
import { FiltersModule } from './filters/filters.module';
import { RedisModule } from './redis/redis.module';
import { MessagingModule } from './messaging/messaging.module';
import { LandingModule } from './landing/landing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 20 }],
    }),
    ScheduleModule.forRoot(),
    RedisModule,
    AiModule,
    AiConfigModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    FirebaseModule,
    UsersModule,
    ProjectsModule,
    InteractionsModule,
    SearchModule,
    ApplicationsModule,
    NotificationsModule,
    DocumentsModule,
    MatchingModule,
    UnlockModule,
    ModerationModule,
    AdminModule,
    AdsModule,
    FiltersModule,
    MessagingModule,
    LandingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
