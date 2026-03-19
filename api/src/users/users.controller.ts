import {
    Controller, Body, Patch, Get, Post, Param, Query,
    UseGuards, UseInterceptors, Request, UploadedFile,
    BadRequestException, Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CandidateModerationService } from './candidate-moderation.service';
import { UpdateUserProfileDto } from './dto/update-user.dto';
import { CreateCandidateProfileDto } from './dto/create-candidate-profile.dto';
import { SaveOnboardingStateDto } from './dto/save-onboarding-state.dto';
import { SaveProjectDraftDto } from './dto/save-project-draft.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { FirebaseAuthOptionalGuard } from '../auth/firebase-auth-optional.guard';
import { PrivacyInterceptor } from '../common/interceptors/privacy.interceptor';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiQuery } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
    private readonly logger = new Logger(UsersController.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly candidateModerationService: CandidateModerationService,
    ) { }

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
    async saveOnboardingState(@Request() req, @Body() dto: SaveOnboardingStateDto) {
        return this.usersService.saveOnboardingState(req.user.uid, dto);
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
    async saveProjectDraft(@Request() req, @Body() dto: SaveProjectDraftDto) {
        return this.usersService.saveProjectDraft(req.user.uid, dto);
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Post('avatar')
    @Throttle({ default: { ttl: 60000, limit: 5 } })
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

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Post('candidate-profile')
    @ApiOperation({ summary: 'Create candidate profile from onboarding data' })
    @ApiResponse({ status: 201, description: 'Candidate profile created.' })
    @ApiResponse({ status: 409, description: 'Candidate profile already exists.' })
    async createCandidateProfile(@Request() req, @Body() dto: CreateCandidateProfileDto) {
        const profile = await this.usersService.createCandidateProfile(req.user.uid, dto);

        // Lancer la modération IA en fire-and-forget
        this.candidateModerationService.moderateProfile(profile.id).catch((err) => {
            this.logger.error(`Moderation failed for profile ${profile.id}: ${err.message}`);
        });

        return profile;
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Patch('candidate-profile')
    @ApiOperation({ summary: 'Update candidate profile and re-run moderation' })
    @ApiResponse({ status: 200, description: 'Candidate profile updated.' })
    @ApiResponse({ status: 404, description: 'No candidate profile found.' })
    async updateCandidateProfile(@Request() req, @Body() dto: CreateCandidateProfileDto) {
        const profile = await this.usersService.updateCandidateProfile(req.user.uid, dto);

        // Relancer la modération IA en fire-and-forget
        this.candidateModerationService.moderateProfile(profile.id).catch((err) => {
            this.logger.error(`Moderation failed for profile ${profile.id}: ${err.message}`);
        });

        return profile;
    }

    // ─── Public / Semi-public ────────────────────────────
    // IMPORTANT: Les routes statiques doivent être AVANT :id/public
    // pour éviter les conflits de matching NestJS.

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

    @Get('candidates/trending')
    @Throttle({ default: { ttl: 60000, limit: 30 } })
    @ApiOperation({ summary: 'Get top 5 trending candidates' })
    @ApiResponse({ status: 200, description: 'Trending candidates returned.' })
    async getTrendingCandidates() {
        return this.usersService.getTrendingCandidates();
    }

    @UseGuards(FirebaseAuthOptionalGuard)
    @UseInterceptors(PrivacyInterceptor)
    @Get(':id/public')
    @ApiOperation({ summary: 'Get public user profile by ID' })
    @ApiResponse({ status: 200, description: 'Public profile returned.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    async getPublicProfile(@Request() req, @Param('id') id: string) {
        return this.usersService.findPublicProfile(id);
    }
}
