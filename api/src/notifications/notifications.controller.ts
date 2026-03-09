import {
    Controller,
    Get,
    Patch,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    @ApiOperation({ summary: 'Lister mes notifications' })
    @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
    @ApiQuery({ name: 'cursor', required: false, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async findAll(
        @Request() req,
        @Query('unreadOnly') unreadOnly?: string,
        @Query('cursor') cursor?: string,
        @Query('limit') limit?: string,
    ) {
        return this.notificationsService.findAll(
            req.user.uid,
            unreadOnly === 'true',
            cursor,
            limit ? parseInt(limit, 10) : undefined,
        );
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Nombre de notifications non-lues' })
    async getUnreadCount(@Request() req) {
        return this.notificationsService.getUnreadCount(req.user.uid);
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Marquer une notification comme lue' })
    async markAsRead(@Request() req, @Param('id') id: string) {
        return this.notificationsService.markAsRead(req.user.uid, id);
    }

    @Patch('read-all')
    @ApiOperation({ summary: 'Marquer toutes les notifications comme lues' })
    async markAllAsRead(@Request() req) {
        return this.notificationsService.markAllAsRead(req.user.uid);
    }
}
