import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
    constructor(private prisma: PrismaService) { }

    async create(founderUid: string, dto: CreateProjectDto) {
        // First, verify the user exists and is a FOUNDER (optional strict check)
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid: founderUid }
        });

        if (!user) {
            throw new Error('User not found');
        }

        return this.prisma.project.create({
            data: {
                founder: { connect: { id: user.id } },
                name: dto.name,
                pitch: dto.pitch,
                description: dto.description,
                sector: dto.sector,
                stage: dto.stage,
                requiredSkills: dto.requiredSkills || [],
            },
        });
    }

    async findAll() {
        return this.prisma.project.findMany({
            include: { founder: true }
        });
    }
}
