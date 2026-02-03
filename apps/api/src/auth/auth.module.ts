import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { FirebaseStrategy } from './firebase.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'firebase-jwt' }),
        FirebaseModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, FirebaseStrategy, PrismaService],
    exports: [AuthService, PassportModule],
})
export class AuthModule { }
