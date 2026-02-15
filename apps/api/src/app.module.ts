import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { FirebaseModule } from './firebase/firebase.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { InteractionsModule } from './interactions/interactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    FirebaseModule,
    UsersModule,
    ProjectsModule,
    InteractionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
