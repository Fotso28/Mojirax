import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('sync')
    @UseGuards(AuthGuard('firebase-jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Sync Firebase User with Database' })
    @ApiResponse({ status: 201, description: 'User synced successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    async syncUser(@Request() req) {
        // req.user is set by FirebaseStrategy.validate()
        const user = await this.authService.syncUser(req.user);
        return user;
    }
}
