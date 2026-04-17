import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray, IsInt, IsObject, IsOptional, IsString,
    MaxLength, Min, Max, Matches, ArrayMaxSize, IsUrl, ValidateIf,
} from 'class-validator';

export class UpdateUserProfileDto {
    @ApiPropertyOptional({ description: 'First name' })
    @IsOptional()
    @ValidateIf(o => o.firstName !== null)
    @IsString()
    @MaxLength(100)
    firstName?: string | null;

    @ApiPropertyOptional({ description: 'Last name' })
    @IsOptional()
    @ValidateIf(o => o.lastName !== null)
    @IsString()
    @MaxLength(100)
    lastName?: string | null;

    @ApiPropertyOptional({ description: 'Phone number' })
    @IsOptional()
    @ValidateIf(o => o.phone !== null && o.phone !== '')
    @IsString()
    @MaxLength(25)
    @Matches(/^\+?[\d\s\-()]{6,25}$/, { message: 'Numéro de téléphone invalide' })
    phone?: string | null;

    @ApiPropertyOptional({ description: 'Address' })
    @IsOptional()
    @ValidateIf(o => o.address !== null)
    @IsString()
    @MaxLength(255)
    address?: string | null;

    // ── Professional profile fields ──

    @ApiPropertyOptional({ description: 'Professional title' })
    @IsOptional()
    @ValidateIf(o => o.title !== null)
    @IsString()
    @MaxLength(120)
    title?: string | null;

    @ApiPropertyOptional({ description: 'Bio' })
    @IsOptional()
    @ValidateIf(o => o.bio !== null)
    @IsString()
    @MaxLength(2000)
    bio?: string | null;

    @ApiPropertyOptional({ description: 'Country' })
    @IsOptional()
    @ValidateIf(o => o.country !== null)
    @IsString()
    @MaxLength(100)
    country?: string | null;

    @ApiPropertyOptional({ description: 'City' })
    @IsOptional()
    @ValidateIf(o => o.city !== null)
    @IsString()
    @MaxLength(100)
    city?: string | null;

    @ApiPropertyOptional({ description: 'LinkedIn URL' })
    @IsOptional()
    @ValidateIf(o => o.linkedinUrl !== '')
    @IsUrl({}, { message: 'URL LinkedIn invalide' })
    @MaxLength(500)
    linkedinUrl?: string;

    @ApiPropertyOptional({ description: 'Website URL' })
    @IsOptional()
    @ValidateIf(o => o.websiteUrl !== '')
    @IsUrl({}, { message: 'URL site web invalide' })
    @MaxLength(500)
    websiteUrl?: string;

    @ApiPropertyOptional({ description: 'GitHub URL' })
    @IsOptional()
    @ValidateIf(o => o.githubUrl !== '')
    @IsUrl({}, { message: 'URL GitHub invalide' })
    @MaxLength(500)
    githubUrl?: string;

    @ApiPropertyOptional({ description: 'Portfolio URL' })
    @IsOptional()
    @ValidateIf(o => o.portfolioUrl !== '')
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
