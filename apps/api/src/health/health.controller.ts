import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { API_VERSION } from '@co-founder/types';
import { HealthCheckDto } from './dto/health-check.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
    @Get()
    @ApiOperation({ summary: 'Health check endpoint' })
    @ApiResponse({
        status: 200,
        description: 'API is healthy and running',
        type: HealthCheckDto
    })
    check(): HealthCheckDto {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            apiVersion: API_VERSION
        };
    }
}
