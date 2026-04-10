import { IsString, IsOptional, IsArray, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCandidateProfileDto {
    @ApiProperty({ example: 'Senior React Developer' })
    @IsString()
    title: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bio?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    shortPitch?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    longPitch?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    mainCompetence?: string;

    @ApiPropertyOptional({ example: ['React', 'Node.js'], type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    skills?: string[];

    @ApiPropertyOptional({ example: ['Français', 'Anglais'], type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    languages?: string[];

    @ApiPropertyOptional({ example: ['AWS Certified', 'PMP'], type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    certifications?: string[];

    @ApiPropertyOptional({ example: 'Douala, Cameroun' })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional({ example: 'https://linkedin.com/in/...' })
    @IsOptional()
    @IsString()
    linkedinUrl?: string;

    @ApiPropertyOptional({ example: 'https://github.com/...' })
    @IsOptional()
    @IsString()
    githubUrl?: string;

    @ApiPropertyOptional({ example: 'https://portfolio.com' })
    @IsOptional()
    @IsString()
    portfolioUrl?: string;

    @ApiPropertyOptional({ example: '6-10' })
    @IsOptional()
    @IsString()
    yearsExp?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    vision?: string;

    @ApiPropertyOptional({ example: 'REMOTE' })
    @IsOptional()
    @IsString()
    locationPref?: string;

    @ApiPropertyOptional({ example: 'FULLTIME' })
    @IsOptional()
    @IsString()
    availability?: string;

    @ApiPropertyOptional({ example: 'EQUITY' })
    @IsOptional()
    @IsString()
    collabPref?: string;

    @ApiPropertyOptional({ example: ['TECH', 'IMPACT'], type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    projectPref?: string[];

    @ApiPropertyOptional({ example: 'TECH' })
    @IsOptional()
    @IsString()
    roleType?: string;

    @ApiPropertyOptional({ example: 'SERIOUS' })
    @IsOptional()
    @IsString()
    commitmentType?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    achievements?: string;

    @ApiPropertyOptional({ example: 'YES' })
    @IsOptional()
    @IsString()
    hasCofounded?: string;
}
