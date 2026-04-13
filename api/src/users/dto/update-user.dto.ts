import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray, IsInt, IsObject, IsOptional, IsString,
    MaxLength, Min, Max, Matches, ArrayMaxSize, IsUrl,
} from 'class-validator';

export class UpdateUserProfileDto {
    @ApiPropertyOptional({ description: 'First name' })
    @IsString()
    @MaxLength(100)
    @IsOptional()
    firstName?: string;

    @ApiPropertyOptional({ description: 'Last name' })
    @IsString()
    @MaxLength(100)
    @IsOptional()
    lastName?: string;

    @ApiPropertyOptional({ description: 'Phone number' })
    @IsString()
    @MaxLength(25)
    @Matches(/^\+?[\d\s\-()]{6,25}$/, { message: 'Numéro de téléphone invalide' })
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional({ description: 'Address' })
    @IsString()
    @MaxLength(255)
    @IsOptional()
    address?: string;

    // ── Professional profile fields ──

    @ApiPropertyOptional({ description: 'Professional title' })
    @IsString()
    @MaxLength(120)
    @IsOptional()
    title?: string;

    @ApiPropertyOptional({ description: 'Bio' })
    @IsString()
    @MaxLength(2000)
    @IsOptional()
    bio?: string;

    @ApiPropertyOptional({ description: 'Country' })
    @IsString()
    @MaxLength(100)
    @IsOptional()
    country?: string;

    @ApiPropertyOptional({ description: 'City' })
    @IsString()
    @MaxLength(100)
    @IsOptional()
    city?: string;

    @ApiPropertyOptional({ description: 'LinkedIn URL' })
    @IsOptional()
    @IsUrl({}, { message: 'URL LinkedIn invalide' })
    @MaxLength(500)
    linkedinUrl?: string;

    @ApiPropertyOptional({ description: 'Website URL' })
    @IsOptional()
    @IsUrl({}, { message: 'URL site web invalide' })
    @MaxLength(500)
    websiteUrl?: string;

    @ApiPropertyOptional({ description: 'GitHub URL' })
    @IsOptional()
    @IsUrl({}, { message: 'URL GitHub invalide' })
    @MaxLength(500)
    githubUrl?: string;

    @ApiPropertyOptional({ description: 'Portfolio URL' })
    @IsOptional()
    @IsUrl({}, { message: 'URL portfolio invalide' })
    @MaxLength(500)
    portfolioUrl?: string;

    @ApiPropertyOptional({ type: [String], description: 'Skills' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(15, { message: 'Maximum 15 compétences' })
    @IsString({ each: true })
    @MaxLength(50, { each: true })
    skills?: string[];

    @ApiPropertyOptional({ type: [String], description: 'Languages' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10, { message: 'Maximum 10 langues' })
    @IsString({ each: true })
    @MaxLength(50, { each: true })
    languages?: string[];

    @ApiPropertyOptional({ type: [String], description: 'Certifications' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10, { message: 'Maximum 10 certifications' })
    @IsString({ each: true })
    @MaxLength(100, { each: true })
    certifications?: string[];

    @ApiPropertyOptional({ description: 'Years of experience' })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(50)
    yearsOfExperience?: number;

    @ApiPropertyOptional({ description: 'Work experience (JSON array)' })
    @IsOptional()
    @IsObject({ each: true })
    @IsArray()
    experience?: Record<string, any>[];

    @ApiPropertyOptional({ description: 'Education (JSON array)' })
    @IsOptional()
    @IsObject({ each: true })
    @IsArray()
    education?: Record<string, any>[];
}
