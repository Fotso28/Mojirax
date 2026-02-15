import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { InteractionsService } from './interactions.service';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

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
}
