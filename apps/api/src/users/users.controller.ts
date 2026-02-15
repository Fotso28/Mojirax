import {
    Controller, Body, Patch, Get, Post,
    UseGuards, UseInterceptors, Request, UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateUserProfileDto } from './dto/update-user.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';

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

    @Get('creating-projet')
    @ApiOperation({ summary: 'Get project creation draft' })
    @ApiResponse({ status: 200, description: 'Project draft retrieved successfully.' })
    async getProjectDraft(@Request() req) {
        return this.usersService.getProjectDraft(req.user.uid);
    }

    @Patch('creating-projet')
    @ApiOperation({ summary: 'Save project creation draft' })
    @ApiResponse({ status: 200, description: 'Project draft saved successfully.' })
    async saveProjectDraft(@Request() req, @Body() body: any) {
        return this.usersService.saveProjectDraft(req.user.uid, body);
    }

    @Post('avatar')
    @ApiOperation({ summary: 'Upload user avatar' })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 200, description: 'Avatar uploaded successfully.' })
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new BadRequestException('Format non supporté. Utilisez JPG, PNG ou WebP.'), false);
            }
        },
    }))
    async uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Aucun fichier fourni.');
        }
        return this.usersService.updateAvatar(req.user.uid, file.buffer);
    }
}
