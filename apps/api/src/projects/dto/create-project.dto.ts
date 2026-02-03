import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsInt, IsUrl, IsBoolean, IsJSON } from 'class-validator';

export class CreateProjectDto {
    @ApiProperty({ description: 'Name of the project' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Short pitch of the project' })
    @IsString()
    pitch: string;

    @ApiProperty({ description: 'Full description of the project' })
    @IsString()
    description: string;

    @ApiProperty({ description: 'Sector of the project', required: false })
    @IsString()
    @IsOptional()
    sector?: string;

    @ApiProperty({ description: 'Stage of the project', required: false })
    @IsString()
    @IsOptional()
    stage?: string;

    @ApiProperty({ description: 'Required skills', required: false, type: [String] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    requiredSkills?: string[];
}
