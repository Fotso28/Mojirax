import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { UpdateUserProfileDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private uploadService: UploadService,
    ) { }

    async findOne(firebaseUid: string) {
        return this.prisma.user.findUnique({
            where: { firebaseUid },
            include: {
                projects: true,
                candidateProfile: true
            }
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

    async saveOnboardingState(firebaseUid: string, state: any) {
        return this.prisma.user.update({
            where: { firebaseUid },
            data: {
                onboardingState: state
            }
        });
    }

    async getOnboardingState(firebaseUid: string) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { onboardingState: true }
        });
        return user?.onboardingState || {};
    }

    async saveProjectDraft(firebaseUid: string, draft: any) {
        return this.prisma.user.update({
            where: { firebaseUid },
            data: {
                projectDraft: draft
            }
        });
    }

    async getProjectDraft(firebaseUid: string) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { projectDraft: true }
        });
        return user?.projectDraft || {};
    }

    async clearProjectDraft(firebaseUid: string) {
        return this.prisma.user.update({
            where: { firebaseUid },
            data: { projectDraft: Prisma.JsonNull }
        });
    }

    async updateAvatar(firebaseUid: string, buffer: Buffer) {
        const user = await this.prisma.user.findUnique({ where: { firebaseUid } });
        if (!user) throw new Error('User not found');

        // Delete old avatar from S3 if it's a MinIO URL
        if (user.image?.includes('/avatars/')) {
            const key = user.image.split('/').slice(-2).join('/');
            await this.uploadService.deleteFile(key);
        }

        const imageUrl = await this.uploadService.uploadAvatar(user.id, buffer);

        return this.prisma.user.update({
            where: { firebaseUid },
            data: { image: imageUrl },
        });
    }
}
