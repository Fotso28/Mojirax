import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService) { }

    async syncUser(firebaseUser: any) {
        const { uid, email, name, picture } = firebaseUser;

        if (!email) {
            throw new Error('Email is required from Firebase Provider');
        }

        // Check if user already has a custom avatar (uploaded via MinIO)
        const existing = await this.prisma.user.findUnique({
            where: { email },
            select: { image: true },
        });

        const hasCustomAvatar = existing?.image?.includes('/avatars/');

        const user = await this.prisma.user.upsert({
            where: { email },
            create: {
                email,
                firebaseUid: uid,
                firstName: name ? name.split(' ')[0] : undefined,
                lastName: name ? name.split(' ').slice(1).join(' ') : undefined,
                image: picture,
                role: 'USER',
            },
            update: {
                firebaseUid: uid,
                // Don't overwrite custom avatar with Google photo
                ...(hasCustomAvatar ? {} : { image: picture }),
            },
        });

        return user;
    }
}
