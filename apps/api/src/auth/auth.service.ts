import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService) { }

    async syncUser(firebaseUser: any) {
        // The firebaseUser object comes from verifyIdToken
        const { uid, email, name, picture } = firebaseUser;

        if (!email) {
            throw new Error('Email is required from Firebase Provider');
        }

        // Upsert User in PostgreSQL
        // We assume the schema has been updated to include firebaseUid
        const user = await this.prisma.user.upsert({
            where: { email: email },
            create: {
                email: email,
                firebaseUid: uid,
                firstName: name ? name.split(' ')[0] : undefined,
                lastName: name ? name.split(' ').slice(1).join(' ') : undefined,
                image: picture,
                role: 'USER', // Default role
            },
            update: {
                firebaseUid: uid, // Ensure link is kept
                image: picture,   // Keep avatar fresh
            },
        });

        return user;
    }
}
