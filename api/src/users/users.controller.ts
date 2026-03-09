import {
    Controller, Body, Patch, Get, Post, Param, Query,
    UseGuards, UseInterceptors, Request, UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateUserProfileDto } from './dto/update-user.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiQuery } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    // ─── Public ────────────────────────────────────────
    @Get(':id/public')
    @ApiOperation({ summary: 'Get public user profile by ID' })
    @ApiResponse({ status: 200, description: 'Public profile returned.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    async getPublicProfile(@Param('id') id: string) {
        return this.usersService.findPublicProfile(id);
    }

    // ─── Protected ─────────────────────────────────────
    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Get('profile')
    @ApiOperation({ summary: 'Get user profile' })
    @ApiResponse({ status: 200, description: 'User profile retrieved successfully.' })
    async getProfile(@Request() req) {
        const user = req.user;
        return this.usersService.findOne(user.uid);
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Patch('profile')
    @ApiOperation({ summary: 'Update user profile and role' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
    async updateProfile(@Request() req, @Body() dto: UpdateUserProfileDto) {
        const user = req.user;
        return this.usersService.updateProfile(user.uid, dto);
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Get('onboarding')
    @ApiOperation({ summary: 'Get onboarding draft state' })
    async getOnboardingState(@Request() req) {
        return this.usersService.getOnboardingState(req.user.uid);
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Patch('onboarding')
    @ApiOperation({ summary: 'Save onboarding draft state' })
    async saveOnboardingState(@Request() req, @Body() body: any) {
        return this.usersService.saveOnboardingState(req.user.uid, body);
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Get('creating-projet')
    @ApiOperation({ summary: 'Get project creation draft' })
    @ApiResponse({ status: 200, description: 'Project draft retrieved successfully.' })
    async getProjectDraft(@Request() req) {
        return this.usersService.getProjectDraft(req.user.uid);
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Patch('creating-projet')
    @ApiOperation({ summary: 'Save project creation draft' })
    @ApiResponse({ status: 200, description: 'Project draft saved successfully.' })
    async saveProjectDraft(@Request() req, @Body() body: any) {
        return this.usersService.saveProjectDraft(req.user.uid, body);
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
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

    @Get('candidates/feed')
    @ApiOperation({ summary: 'Get candidate feed for founders' })
    @ApiQuery({ name: 'cursor', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'city', required: false, description: 'Filter by city' })
    @ApiQuery({ name: 'sector', required: false, description: 'Filter by desired sector' })
    @ApiQuery({ name: 'skills', required: false, isArray: true, description: 'Filter by skills' })
    async getCandidatesFeed(
        @Request() req,
        @Query('cursor') cursor?: string,
        @Query('limit') limit?: string,
        @Query('city') city?: string,
        @Query('sector') sector?: string,
        @Query('skills') skills?: string | string[],
    ) {
        const uid = req.user?.uid || null;
        const pageSize = Math.min(parseInt(limit || '7', 10), 20);
        const skillsArray = typeof skills === 'string' ? [skills] : skills;
        return this.usersService.getCandidatesFeed(uid, cursor || null, pageSize, {
            city,
            sector,
            skills: skillsArray,
        });
    }
}
