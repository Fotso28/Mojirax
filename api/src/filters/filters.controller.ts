import { Controller, Get, Query } from '@nestjs/common';
import { FiltersService } from './filters.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('filters')
@Controller('filters')
export class FiltersController {
    constructor(private readonly filtersService: FiltersService) {}

    @Get('popular-skills')
    @ApiOperation({ summary: 'Get top popular skills for feed filters' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of skills (default 20, max 50)' })
    async getPopularSkills(@Query('limit') limit?: string) {
        const parsed = parseInt(limit || '20', 10);
        const n = Number.isNaN(parsed) ? 20 : Math.min(Math.max(parsed, 1), 50);
        return this.filtersService.getPopularSkills(n);
    }
}
