import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Query,
    Body,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

class SubscribePushDto {
    @IsString()
    @MaxLength(500)
    token: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    device?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    browser?: string;
}

class UnsubscribePushDto {
    @IsString()
    @MaxLength(500)
    token: string;
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('notifications')
export class NotificationsController {
    constructor(
        private readonly notificationsService: NotificationsService,
        private readonly pushService: PushService,
    ) { }

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

    // ─── Push Notifications ──────────────────────────

    @Post('push/subscribe')
    @ApiOperation({ summary: 'Enregistrer un token FCM pour les push notifications' })
    async subscribePush(@Request() req, @Body() dto: SubscribePushDto) {
        const user = await this.notificationsService.resolveUserPublic(req.user.uid);
        await this.pushService.subscribe(user.id, dto.token, dto.device, dto.browser);
        return { success: true };
    }

    @Delete('push/unsubscribe')
    @ApiOperation({ summary: 'Supprimer un token FCM' })
    async unsubscribePush(@Body() dto: UnsubscribePushDto) {
        await this.pushService.unsubscribe(dto.token);
        return { success: true };
    }

    // ─── Routes statiques avant routes paramétrées ─────

    @Patch('read-all')
    @ApiOperation({ summary: 'Marquer toutes les notifications comme lues' })
    async markAllAsRead(@Request() req) {
        return this.notificationsService.markAllAsRead(req.user.uid);
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Marquer une notification comme lue' })
    async markAsRead(@Request() req, @Param('id') id: string) {
        return this.notificationsService.markAsRead(req.user.uid, id);
    }
}
