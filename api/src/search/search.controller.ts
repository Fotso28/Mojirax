import { Controller, Get, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SearchService } from './search.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { FirebaseAuthOptionalGuard } from '../auth/firebase-auth-optional.guard';
import { SearchQueryDto, SemanticSearchQueryDto } from './dto/search-query.dto';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('search')
@Controller('search')
export class SearchController {
    constructor(private readonly searchService: SearchService) { }

    @Get('universal')
    @UseGuards(FirebaseAuthOptionalGuard)
    @Throttle({ default: { limit: 15, ttl: 60000 } })
    @ApiOperation({ summary: 'Recherche universelle (projets, personnes, skills)' })
    @ApiQuery({ name: 'q', description: 'Requête de recherche (min 2, max 200 caractères)' })
    async searchUniversal(
        @Query() dto: SearchQueryDto,
        @Request() req?: any,
    ) {
        const firebaseUid = req?.user?.uid;
        return this.searchService.searchUniversal(dto.q.trim(), firebaseUid);
    }

    @Get()
    @UseGuards(FirebaseAuthOptionalGuard)
    @Throttle({ default: { limit: 15, ttl: 60000 } })
    @ApiOperation({ summary: 'Recherche sémantique de projets et candidats' })
    @ApiQuery({ name: 'q', description: 'Requête de recherche (min 2, max 200 caractères)' })
    @ApiQuery({ name: 'sector', required: false, description: 'Filtrer par secteur' })
    @ApiQuery({ name: 'city', required: false, description: 'Filtrer par ville' })
    async search(
        @Query() dto: SemanticSearchQueryDto,
        @Request() req?: any,
    ) {
        const firebaseUid = req?.user?.uid;
        return this.searchService.search(dto.q, firebaseUid, { sector: dto.sector, city: dto.city });
    }

    @Get('history')
    @UseGuards(FirebaseAuthGuard)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Récupérer l\'historique des recherches' })
    async getHistory(@Request() req: any) {
        return this.searchService.getHistory(req.user.uid);
    }

    @Delete('history')
    @UseGuards(FirebaseAuthGuard)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Supprimer l\'historique des recherches' })
    async clearHistory(@Request() req: any) {
        return this.searchService.clearHistory(req.user.uid);
    }
}
