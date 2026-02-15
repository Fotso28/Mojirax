import {
    Controller, Post, Get, Param, Body, Query,
    UseGuards, UseInterceptors, Request, UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiConsumes } from '@nestjs/swagger';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) { }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Post()
    @ApiOperation({ summary: 'Create a new project' })
    @ApiResponse({ status: 201, description: 'The project has been successfully created.' })
    async create(@Request() req, @Body() dto: CreateProjectDto) {
        const user = req.user;
        return this.projectsService.create(user.uid, dto);
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Get('feed')
    @ApiOperation({ summary: 'Get personalized project feed' })
    @ApiQuery({ name: 'cursor', required: false, description: 'Last project ID for pagination' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of projects per page (default 7)' })
    @ApiResponse({ status: 200, description: 'Personalized feed returned.' })
    async getFeed(
        @Request() req,
        @Query('cursor') cursor?: string,
        @Query('limit') limit?: string,
    ) {
        const uid = req.user?.uid || null;
        const pageSize = Math.min(parseInt(limit || '7', 10), 20);
        return this.projectsService.getFeed(uid, cursor || null, pageSize);
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Post(':id/logo')
    @ApiOperation({ summary: 'Upload project logo' })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 200, description: 'Logo uploaded successfully.' })
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new BadRequestException('Format non supporté. Utilisez JPG, PNG ou WebP.'), false);
            }
        },
    }))
    async uploadLogo(
        @Request() req,
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('Aucun fichier fourni.');
        }
        return this.projectsService.updateLogo(req.user.uid, id, file.buffer);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get project by ID' })
    @ApiResponse({ status: 200, description: 'Project details returned.' })
    @ApiResponse({ status: 404, description: 'Project not found.' })
    async findOne(@Param('id') id: string) {
        return this.projectsService.findOne(id);
    }

    @Get()
    @ApiOperation({ summary: 'List all public projects' })
    async findAll() {
        return this.projectsService.findAll();
    }
}
