import {
    Controller, Post, Get, Patch, Delete, Param, Body, Query,
    UseGuards, UseInterceptors, Request, UploadedFile,
    BadRequestException, ForbiddenException, NotFoundException, Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateSummaryDto } from './dto/update-summary.dto';
import { RegenerateBlockDto } from './dto/regenerate-block.dto';
import { ValidateProjectDto } from './dto/validate-project.dto';
import { CreateFromDocumentDto } from './dto/create-from-document.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { FirebaseAuthOptionalGuard } from '../auth/firebase-auth-optional.guard';
import { PlanGuard } from '../payment/guards/plan.guard';
import { RequiresPlan } from '../payment/decorators/requires-plan.decorator';
import { UserPlan } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { DocumentStorageService } from '../documents/document-storage.service';
import { DocumentAnalysisService } from '../documents/document-analysis.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrivacyInterceptor } from '../common/interceptors/privacy.interceptor';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { I18nService } from '../i18n/i18n.service';
import { Locale } from '../common/decorators/locale.decorator';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
    private readonly logger = new Logger(ProjectsController.name);

    constructor(
        private readonly projectsService: ProjectsService,
        private readonly aiService: AiService,
        private readonly documentStorageService: DocumentStorageService,
        private readonly documentAnalysisService: DocumentAnalysisService,
        private readonly prisma: PrismaService,
        private readonly i18n: I18nService,
    ) { }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard, PlanGuard)
    @RequiresPlan(UserPlan.PLUS)
    @Post()
    @Throttle({ default: { ttl: 60000, limit: 3 } })
    @ApiOperation({ summary: 'Create a new project (plan PLUS minimum)' })
    @ApiResponse({ status: 201, description: 'The project has been successfully created.' })
    async create(@Request() req, @Body() dto: CreateProjectDto, @Locale() locale: 'fr' | 'en') {
        const user = req.user;
        return this.projectsService.create(user.uid, dto, locale);
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Post('validate')
    @ApiOperation({ summary: 'Validate project data with AI before submission' })
    @ApiResponse({ status: 200, description: 'AI validation feedback returned.' })
    async validateProject(@Body() dto: ValidateProjectDto) {
        return this.aiService.validateProject(dto);
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard, PlanGuard)
    @RequiresPlan(UserPlan.PLUS)
    @Post('from-document')
    @ApiOperation({ summary: 'Create project from uploaded document (PDF/DOCX) — plan PLUS minimum, async AI analysis' })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 201, description: 'Project created in ANALYZING status. AI analysis runs in background.' })
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const allowed = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ];
            if (allowed.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new BadRequestException('upload.format_document'), false);
            }
        },
    }))
    async createFromDocument(
        @Request() req,
        @UploadedFile() file: Express.Multer.File,
        @Body() body: CreateFromDocumentDto,
        @Locale() locale: 'fr' | 'en',
    ) {
        if (!file) {
            throw new BadRequestException(this.i18n.t('upload.no_file', locale));
        }
        if (!body.name || !body.pitch) {
            throw new BadRequestException(this.i18n.t('project.name_pitch_required', locale));
        }

        // 1. Create the project in ANALYZING status with minimal data
        const project = await this.projectsService.createWithStatus(req.user.uid, {
            name: body.name,
            pitch: body.pitch,
            country: body.country,
            city: body.city,
            location: body.location,
        }, 'ANALYZING', locale);

        // 2. Store the document
        const documentUrl = await this.documentStorageService.store(
            project.id,
            file.buffer,
            file.originalname,
            file.mimetype,
        );

        // 3. Save document metadata on the project
        await this.prisma.project.update({
            where: { id: project.id },
            data: {
                documentUrl,
                documentName: file.originalname,
                documentMimeType: file.mimetype,
            },
        });

        this.logger.log(`Document stored for project ${project.id}: ${file.originalname}`);

        // 4. Launch analysis in background (fire-and-forget)
        this.documentAnalysisService.analyzeProject(project.id).catch(err =>
            this.logger.error(`Background analysis failed for project ${project.id}: ${err.message}`)
        );

        // 5. Return immediately with project id and slug
        return {
            id: project.id,
            slug: project.slug,
            name: project.name,
            status: 'ANALYZING',
            documentUrl,
            documentName: file.originalname,
        };
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Post(':id/regenerate-block')
    @ApiOperation({ summary: 'Regenerate a single AI summary block from the uploaded document' })
    @ApiResponse({ status: 200, description: 'Updated aiSummary returned.' })
    async regenerateBlock(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: RegenerateBlockDto,
    ) {
        // Ownership is verified inside regenerateBlock via firebaseUid
        const updatedSummary = await this.documentAnalysisService.regenerateBlock(req.user.uid, id, dto.blockKey);
        return { aiSummary: updatedSummary };
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Patch(':id/summary')
    @ApiOperation({ summary: 'Manually update AI summary blocks' })
    @ApiResponse({ status: 200, description: 'Summary updated.' })
    async updateSummary(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: UpdateSummaryDto,
        @Locale() locale: 'fr' | 'en',
    ) {
        // Verify ownership
        const project = await this.findProjectAndVerifyOwnership(id, req.user.uid, locale);

        const updated = await this.prisma.project.update({
            where: { id: project.id },
            data: { aiSummary: dto.aiSummary },
            select: { id: true, aiSummary: true },
        });

        this.logger.log(`AI summary manually updated for project ${project.id}`);
        return updated;
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Post(':id/publish')
    @ApiOperation({ summary: 'Publish a project (requires aiSummary to be set)' })
    @ApiResponse({ status: 200, description: 'Project published.' })
    async publish(
        @Request() req,
        @Param('id') id: string,
        @Locale() locale: 'fr' | 'en',
    ) {
        // Verify ownership
        const project = await this.findProjectAndVerifyOwnership(id, req.user.uid, locale);

        if (!project.aiSummary) {
            throw new BadRequestException(this.i18n.t('project.ai_summary_required', locale));
        }

        const updated = await this.prisma.$transaction(async (tx) => {
            await this.projectsService.archivePublishedProjects(tx, project.founderId, locale);

            return tx.project.update({
                where: { id: project.id },
                data: { status: 'PUBLISHED' },
            });
        });

        this.logger.log(`Project ${project.id} published by owner`);
        return updated;
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Get(':id/document')
    @ApiOperation({ summary: 'Get document metadata for a project' })
    @ApiResponse({ status: 200, description: 'Document metadata returned.' })
    async getDocument(@Request() req, @Param('id') id: string, @Locale() locale: 'fr' | 'en') {
        await this.findProjectAndVerifyOwnership(id, req.user.uid, locale);

        const project = await this.prisma.project.findUnique({
            where: { id },
            select: {
                documentUrl: true,
                documentName: true,
                documentMimeType: true,
            },
        });

        if (!project) {
            throw new NotFoundException(this.i18n.t('project.not_found', locale));
        }

        return {
            documentUrl: project.documentUrl,
            documentName: project.documentName,
            documentMimeType: project.documentMimeType,
        };
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Get('feed')
    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @ApiOperation({ summary: 'Get personalized project feed (rate-limited due to vector search cost)' })
    @ApiQuery({ name: 'cursor', required: false, description: 'Last project ID for pagination' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of projects per page (default 7)' })
    @ApiQuery({ name: 'city', required: false, description: 'Filter by city' })
    @ApiQuery({ name: 'sector', required: false, description: 'Filter by sector' })
    @ApiQuery({ name: 'skills', required: false, isArray: true, description: 'Filter by required skills' })
    @ApiResponse({ status: 200, description: 'Personalized feed returned.' })
    async getFeed(
        @Request() req,
        @Query('cursor') cursor?: string,
        @Query('limit') limit?: string,
        @Query('city') city?: string,
        @Query('sector') sector?: string,
        @Query('skills') skills?: string | string[],
    ) {
        const uid = req.user?.uid || null;
        const pageSize = Math.min(parseInt(limit || '7', 10), 20);

        const skillsArray = typeof skills === 'string' ? [skills] : skills;

        return this.projectsService.getFeed(uid, cursor || null, pageSize, {
            city,
            sector,
            skills: skillsArray,
        });
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Post(':id/logo')
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @ApiOperation({ summary: 'Upload project logo' })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 200, description: 'Logo uploaded successfully.' })
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new BadRequestException('upload.format_image'), false);
            }
        },
    }))
    async uploadLogo(
        @Request() req,
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File,
        @Locale() locale: 'fr' | 'en',
    ) {
        if (!file) {
            throw new BadRequestException(this.i18n.t('upload.no_file', locale));
        }
        return this.projectsService.updateLogo(req.user.uid, id, file.buffer, locale);
    }

    @Get('trending')
    @Throttle({ default: { ttl: 60000, limit: 30 } })
    @ApiOperation({ summary: 'Get top 5 trending projects' })
    @ApiResponse({ status: 200, description: 'Trending projects returned.' })
    async getTrending() {
        return this.projectsService.getTrending();
    }

    @UseGuards(FirebaseAuthOptionalGuard)
    @UseInterceptors(PrivacyInterceptor)
    @Get(':idOrSlug')
    @ApiOperation({ summary: 'Get project by ID or slug' })
    @ApiResponse({ status: 200, description: 'Project details returned.' })
    @ApiResponse({ status: 404, description: 'Project not found.' })
    async findOne(@Request() req, @Param('idOrSlug') idOrSlug: string, @Locale() locale: 'fr' | 'en') {
        return this.projectsService.findOne(idOrSlug, locale);
    }

    @Get()
    @ApiOperation({ summary: 'List all public projects' })
    async findAll() {
        return this.projectsService.findAll();
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Patch(':id')
    @ApiOperation({ summary: 'Update a project' })
    @ApiResponse({ status: 200, description: 'Project updated.' })
    async update(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: UpdateProjectDto,
        @Locale() locale: 'fr' | 'en',
    ) {
        await this.findProjectAndVerifyOwnership(id, req.user.uid, locale);
        return this.projectsService.update(req.user.uid, id, dto, locale);
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a project' })
    @ApiResponse({ status: 200, description: 'Project deleted.' })
    async remove(
        @Request() req,
        @Param('id') id: string,
        @Locale() locale: 'fr' | 'en',
    ) {
        await this.findProjectAndVerifyOwnership(id, req.user.uid, locale);
        return this.projectsService.remove(req.user.uid, id, locale);
    }

    // ─── Private helpers ────────────────────────────────

    private async findProjectAndVerifyOwnership(projectId: string, firebaseUid: string, locale: 'fr' | 'en' = 'fr') {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true },
        });

        if (!user) {
            throw new NotFoundException(this.i18n.t('user.not_found', locale));
        }

        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            throw new NotFoundException(this.i18n.t('project.not_found', locale));
        }

        if (project.founderId !== user.id) {
            throw new ForbiddenException(this.i18n.t('project.not_owner', locale));
        }

        return project;
    }
}
