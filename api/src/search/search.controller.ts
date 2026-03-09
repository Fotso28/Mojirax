import { Controller, Get, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { SearchService } from './search.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('search')
@Controller('search')
export class SearchController {
    constructor(private readonly searchService: SearchService) { }

    @Get()
    @ApiOperation({ summary: 'Recherche sémantique de projets et candidats' })
    @ApiQuery({ name: 'q', description: 'Requête de recherche' })
    @ApiQuery({ name: 'sector', required: false, description: 'Filtrer par secteur' })
    @ApiQuery({ name: 'city', required: false, description: 'Filtrer par ville' })
    async search(
        @Query('q') query: string,
        @Query('sector') sector?: string,
        @Query('city') city?: string,
        @Request() req?: any,
    ) {
        const userId = req?.user?.uid;
        return this.searchService.search(query, userId, { sector, city });
    }

    @Get('history')
    @UseGuards(FirebaseAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Récupérer l\'historique des recherches' })
    async getHistory(@Request() req: any) {
        return this.searchService.getHistory(req.user.uid);
    }

    @Delete('history')
    @UseGuards(FirebaseAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Supprimer l\'historique des recherches' })
    async clearHistory(@Request() req: any) {
        return this.searchService.clearHistory(req.user.uid);
    }
}
