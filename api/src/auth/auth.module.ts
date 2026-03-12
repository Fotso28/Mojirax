import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { FirebaseStrategy } from './firebase.strategy';
import { VisitsService } from './visits.service';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'firebase-jwt' }),
        FirebaseModule,
        NotificationsModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, FirebaseStrategy, VisitsService, PrismaService],
    exports: [AuthService, VisitsService, PassportModule],
})
export class AuthModule { }
