import { Controller, Body, Patch, Get, UseGuards, Request } from '@nestjs/common';
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

    @Get('profile')
    @ApiOperation({ summary: 'Get user profile' })
    @ApiResponse({ status: 200, description: 'User profile retrieved successfully.' })
    async getProfile(@Request() req) {
        const user = req.user;
        return this.usersService.findOne(user.uid);
    }

    @Patch('profile')
    @ApiOperation({ summary: 'Update user profile and role' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
    async updateProfile(@Request() req, @Body() dto: UpdateUserProfileDto) {
        const user = req.user; // Injected by FirebaseAuthStrategy
        return this.usersService.updateProfile(user.uid, dto);
    }

    @Get('onboarding')
    @ApiOperation({ summary: 'Get onboarding draft state' })
    async getOnboardingState(@Request() req) {
        return this.usersService.getOnboardingState(req.user.uid);
    }

    @Patch('onboarding')
    @ApiOperation({ summary: 'Save onboarding draft state' })
    async saveOnboardingState(@Request() req, @Body() body: any) {
        return this.usersService.saveOnboardingState(req.user.uid, body);
    }
}
