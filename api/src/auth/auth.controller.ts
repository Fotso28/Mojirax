import { Controller, Post, UseGuards, Request, Headers, Ip } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { VisitsService } from './visits.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private visitsService: VisitsService,
    ) { }

    @Post('sync')
    @Throttle({ default: { ttl: 60000, limit: 30 } })
    @UseGuards(AuthGuard('firebase-jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Sync Firebase User with Database' })
    @ApiResponse({ status: 201, description: 'User synced successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    async syncUser(
        @Request() req,
        @Ip() ip: string,
        @Headers('user-agent') userAgent: string,
    ) {
        // req.user is set by FirebaseStrategy.validate()
        const user = await this.authService.syncUser(req.user);

        // Track visit (fire & forget — ne bloque pas la réponse)
        this.visitsService.trackVisit(user.id, ip, userAgent);

        return user;
    }
}
