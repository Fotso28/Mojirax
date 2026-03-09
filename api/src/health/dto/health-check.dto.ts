import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckDto {
    @ApiProperty({
        example: 'ok',
        description: 'Health status of the API'
    })
    status: string;

    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Current timestamp'
    })
    timestamp: string;

    @ApiProperty({
        example: '1.0.0',
        description: 'API version'
    })
    version: string;

    @ApiProperty({
        example: 'v1',
        description: 'API version from shared types'
    })
    apiVersion: string;
}
