import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
    Request,
    NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { UnlockService } from './unlock.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('unlock')
@Controller('unlock')
export class UnlockController {
    constructor(
        private readonly unlockService: UnlockService,
        private readonly prisma: PrismaService,
    ) {}

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Get('check/:targetId')
    @ApiOperation({ summary: 'Vérifier si un profil/projet est débloqué' })
    @ApiResponse({ status: 200, description: '{ unlocked: boolean }' })
    async checkUnlock(
        @Request() req,
        @Param('targetId') targetId: string,
    ) {
        const user = await this.resolveUser(req.user.uid);
        const unlocked = await this.unlockService.hasUnlock(user.id, targetId);
        return { unlocked };
    }

    @ApiBearerAuth()
    @UseGuards(FirebaseAuthGuard)
    @Get('mine')
    @ApiOperation({ summary: 'Lister mes profils/projets débloqués' })
    @ApiQuery({ name: 'take', required: false, description: 'Nombre de résultats (défaut 20, max 100)' })
    @ApiQuery({ name: 'skip', required: false, description: 'Offset pour pagination' })
    @ApiResponse({ status: 200, description: 'Liste des unlocks' })
    async listMyUnlocks(
        @Request() req,
        @Query('take') take?: string,
        @Query('skip') skip?: string,
    ) {
        const user = await this.resolveUser(req.user.uid);
        return this.unlockService.listMyUnlocks(
            user.id,
            take ? parseInt(take, 10) : 20,
            skip ? parseInt(skip, 10) : 0,
        );
    }

    private async resolveUser(firebaseUid: string) {
        const user = await this.prisma.user.findUnique({
            where: { firebaseUid },
            select: { id: true },
        });

        if (!user) {
            throw new NotFoundException('Utilisateur introuvable');
        }

        return user;
    }
}
