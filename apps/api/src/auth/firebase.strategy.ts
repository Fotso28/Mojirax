import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-firebase-jwt';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseStrategy extends PassportStrategy(Strategy, 'firebase-jwt') {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        });
    }

    async validate(token: string): Promise<admin.auth.DecodedIdToken> {
        try {
            const firebaseUser = await admin.auth().verifyIdToken(token);
            if (!firebaseUser) {
                throw new UnauthorizedException();
            }
            return firebaseUser;
        } catch (error) {
            console.log(error);
            throw new UnauthorizedException('Invalid Firebase Token');
        }
    }
}
