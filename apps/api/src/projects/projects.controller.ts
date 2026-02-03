import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

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

    @Get()
    @ApiOperation({ summary: 'List all public projects' })
    async findAll() {
        return this.projectsService.findAll();
    }
}
