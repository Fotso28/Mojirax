import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateSummaryDto {
    @ApiProperty({ description: 'AI summary blocks (key-value pairs)', example: { problem: 'Description...', solution: 'Solution...' } })
    @IsObject()
    aiSummary: Record<string, string>;
}
