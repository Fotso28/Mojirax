import {
    Controller,
    Post,
    Get,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
    UseInterceptors,
    Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { PrivacyInterceptor } from '../common/interceptors/privacy.interceptor';

@ApiTags('applications')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('applications')
export class ApplicationsController {
    constructor(private readonly applicationsService: ApplicationsService) { }

    @Post()
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @ApiOperation({ summary: 'Postuler à un projet' })
    async apply(@Request() req, @Body() dto: CreateApplicationDto) {
        return this.applicationsService.apply(req.user.uid, dto);
    }

    @Get('mine')
    @ApiOperation({ summary: 'Lister mes candidatures' })
    @ApiQuery({ name: 'take', required: false, type: Number })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    async findMine(
        @Request() req,
        @Query('take') take?: string,
        @Query('skip') skip?: string,
    ) {
        return this.applicationsService.findMine(
            req.user.uid,
            take ? parseInt(take, 10) : undefined,
            skip ? parseInt(skip, 10) : undefined,
        );
    }

    @Get('project/:projectId')
    @UseInterceptors(PrivacyInterceptor)
    @ApiOperation({ summary: 'Lister les candidatures reçues pour un projet (fondateur uniquement)' })
    @ApiQuery({ name: 'take', required: false, type: Number })
    @ApiQuery({ name: 'skip', required: false, type: Number })
    async findByProject(
        @Request() req,
        @Param('projectId') projectId: string,
        @Query('take') take?: string,
        @Query('skip') skip?: string,
    ) {
        return this.applicationsService.findByProject(
            req.user.uid,
            projectId,
            take ? parseInt(take, 10) : undefined,
            skip ? parseInt(skip, 10) : undefined,
        );
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Accepter ou refuser une candidature (fondateur uniquement)' })
    async updateStatus(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: UpdateApplicationStatusDto,
    ) {
        return this.applicationsService.updateStatus(req.user.uid, id, dto.status);
    }

    @Get('check/:projectId')
    @ApiOperation({ summary: 'Vérifier si le candidat a déjà postulé à un projet' })
    async hasApplied(
        @Request() req,
        @Param('projectId') projectId: string,
    ) {
        return this.applicationsService.hasApplied(req.user.uid, projectId);
    }
}
