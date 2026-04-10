import { Controller, Post, Get, Body, UseGuards, Request, Param, Query } from '@nestjs/common';
import { InteractionsService } from './interactions.service';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PlanGuard } from '../payment/guards/plan.guard';
import { RequiresPlan } from '../payment/decorators/requires-plan.decorator';
import { UserPlan } from '@prisma/client';

@ApiTags('interactions')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('interactions')
export class InteractionsController {
    constructor(private readonly interactionsService: InteractionsService) { }

    @Post()
    @ApiOperation({ summary: 'Track a user-project interaction' })
    @ApiResponse({ status: 201, description: 'Interaction recorded.' })
    async create(@Request() req, @Body() dto: CreateInteractionDto) {
        return this.interactionsService.create(req.user.uid, dto);
    }

    @Get('saved')
    @ApiOperation({ summary: 'Get IDs of projects saved by the current user' })
    @ApiResponse({ status: 200, description: 'Array of saved project IDs.' })
    async getSaved(@Request() req): Promise<string[]> {
        return this.interactionsService.getSavedProjectIds(req.user.uid);
    }

    @UseGuards(FirebaseAuthGuard, PlanGuard)
    @RequiresPlan(UserPlan.PLUS)
    @Post('undo')
    @ApiOperation({ summary: 'Undo the last skip within the last 5 minutes (PLUS+)' })
    @ApiResponse({ status: 200, description: 'Undo result.' })
    async undoLastSkip(@Request() req) {
        const result = await this.interactionsService.undoLastSkip(req.user.uid);
        if (!result) {
            return { success: false, message: 'Aucun skip récent à annuler' };
        }
        return { success: true, projectId: result.projectId };
    }

    @UseGuards(FirebaseAuthGuard, PlanGuard)
    @RequiresPlan(UserPlan.PRO)
    @Get('likes/:projectId')
    @ApiOperation({ summary: 'Get users who liked a project (PRO+)' })
    @ApiResponse({ status: 200, description: 'List of likers with user info.' })
    async getLikers(
        @Param('projectId') projectId: string,
        @Query('take') take?: string,
        @Query('skip') skip?: string,
    ) {
        return this.interactionsService.getLikers(
            projectId,
            take ? parseInt(take, 10) : 20,
            skip ? parseInt(skip, 10) : 0,
        );
    }

    @UseGuards(FirebaseAuthGuard)
    @Get('likes-count/:projectId')
    @ApiOperation({ summary: 'Get the number of likes on a project' })
    @ApiResponse({ status: 200, description: 'Like count.' })
    async getLikersCount(@Param('projectId') projectId: string) {
        const count = await this.interactionsService.getLikersCount(projectId);
        return { count };
    }
}
