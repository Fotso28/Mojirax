import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserProfileDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findOne(firebaseUid: string) {
        return this.prisma.user.findUnique({
            where: { firebaseUid },
        });
    }

    async updateProfile(firebaseUid: string, dto: UpdateUserProfileDto) {
        return this.prisma.user.update({
            where: { firebaseUid },
            data: {
                ...dto,
            },
        });
    }
}
