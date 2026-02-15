import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsNumber, Min, Max } from 'class-validator';

export class CreateInteractionDto {
    @ApiProperty({ description: 'Project ID' })
    @IsString()
    projectId: string;

    @ApiProperty({ description: 'Action: VIEW, CLICK, SAVE, UNSAVE, SKIP, SHARE' })
    @IsString()
    action: string;

    @ApiProperty({ description: 'Time spent on project in ms', required: false })
    @IsInt()
    @Min(0)
    @IsOptional()
    dwellTimeMs?: number;

    @ApiProperty({ description: 'Scroll depth 0.0 to 1.0', required: false })
    @IsNumber()
    @Min(0)
    @Max(1)
    @IsOptional()
    scrollDepth?: number;

    @ApiProperty({ description: 'Source: FEED, SEARCH, DIRECT, NOTIFICATION', required: false })
    @IsString()
    @IsOptional()
    source?: string;

    @ApiProperty({ description: 'Position in feed', required: false })
    @IsInt()
    @Min(0)
    @IsOptional()
    position?: number;
}
