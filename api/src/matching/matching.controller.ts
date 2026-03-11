import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    UseGuards,
    UseInterceptors,
    Request,
    ForbiddenException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { PrivacyInterceptor } from '../common/interceptors/privacy.interceptor';
import { MatchingService } from './matching.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Matching')
@Controller('matching')
export class MatchingController {
    private readonly logger = new Logger(MatchingController.name);

    constructor(
        private readonly matchingService: MatchingService,
        private readonly prisma: PrismaService,
    ) {}

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @UseInterceptors(PrivacyInterceptor)
    @Get('project/:id')
    @ApiOperation({ summary: 'Top matching candidates for a project' })
    @ApiResponse({ status: 200, description: 'List of top matches.' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getMatchesForProject(
        @Param('id') projectId: string,
        @Query('limit') limit: string,
        @Request() req,
    ) {
        // Verify ownership
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            select: { founderId: true },
        });

        if (!project) throw new NotFoundException('Projet introuvable');

        const user = await this.prisma.user.findUnique({
            where: { firebaseUid: req.user.uid },
            select: { id: true },
        });

        if (project.founderId !== user?.id) {
            throw new ForbiddenException('Vous n\'êtes pas le propriétaire de ce projet');
        }

        const take = Math.min(parseInt(limit) || 10, 20);
        return this.matchingService.getTopMatchesForProject(projectId, take);
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Get('candidate')
    @ApiOperation({ summary: 'Top matching projects for current candidate' })
    @ApiResponse({ status: 200, description: 'List of top project matches.' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getMatchesForCandidate(
        @Query('limit') limit: string,
        @Request() req,
    ) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid: req.user.uid },
            select: { id: true, candidateProfile: { select: { id: true } } },
        });

        if (!user?.candidateProfile) {
            throw new NotFoundException('Profil candidat introuvable');
        }

        const take = Math.min(parseInt(limit) || 10, 20);
        return this.matchingService.getTopMatchesForCandidate(user.candidateProfile.id, take);
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Post('recalculate/project/:id')
    @ApiOperation({ summary: 'Force recalculate match scores for a project' })
    @ApiResponse({ status: 200, description: 'Match scores recalculated.' })
    async recalculateForProject(
        @Param('id') projectId: string,
        @Request() req,
    ) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            select: { founderId: true, name: true },
        });

        if (!project) throw new NotFoundException('Projet introuvable');

        const user = await this.prisma.user.findUnique({
            where: { firebaseUid: req.user.uid },
            select: { id: true },
        });

        if (project.founderId !== user?.id) {
            throw new ForbiddenException('Vous n\'êtes pas le propriétaire de ce projet');
        }

        const count = await this.matchingService.calculateForProject(projectId);

        this.logger.log(`Recalculated ${count} matches for project ${projectId} (${project.name})`);

        return { recalculated: count, projectId };
    }
}
