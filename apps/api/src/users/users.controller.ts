import { Controller, Body, Patch, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserProfileDto } from './dto/update-user.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Patch('profile')
    @ApiOperation({ summary: 'Update user profile and role' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
    async updateProfile(@Request() req, @Body() dto: UpdateUserProfileDto) {
        const user = req.user; // Injected by FirebaseAuthStrategy
        return this.usersService.updateProfile(user.uid, dto);
    }
}
