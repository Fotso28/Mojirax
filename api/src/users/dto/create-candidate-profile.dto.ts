import { IsString, IsOptional, IsArray, MaxLength, ArrayMaxSize, IsIn, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCandidateProfileDto {
    @ApiPropertyOptional({ description: 'Short pitch (280 chars)' })
    @IsOptional()
    @IsString()
    @MaxLength(280, { message: 'Le pitch court ne doit pas dépasser 280 caractères' })
    shortPitch?: string;

    @ApiPropertyOptional({ description: 'Long pitch / motivation' })
    @IsOptional()
    @IsString()
    @MaxLength(2000, { message: 'Le message libre ne doit pas dépasser 2000 caractères' })
    longPitch?: string;

    @ApiPropertyOptional({ description: 'Vision at 3-5 years' })
    @IsOptional()
    @IsString()
    @MaxLength(500, { message: 'La vision ne doit pas dépasser 500 caractères' })
    vision?: string;

    @ApiPropertyOptional({ example: 'TECH' })
    @IsOptional()
    @IsIn(['TECH', 'PRODUCT', 'MARKETING', 'OPS', 'FINANCE'], { message: 'Type de rôle invalide' })
    roleType?: string;

    @ApiPropertyOptional({ example: 'SERIOUS' })
    @IsOptional()
    @IsIn(['SIDE', 'SERIOUS', 'FULLTIME'], { message: "Type d'engagement invalide" })
    commitmentType?: string;

    @ApiPropertyOptional({ example: 'EQUITY' })
    @IsOptional()
    @IsIn(['EQUITY', 'PAID', 'HYBRID', 'DISCUSS'], { message: 'Préférence de collaboration invalide' })
    collabPref?: string;

    @ApiPropertyOptional({ example: 'REMOTE' })
    @IsOptional()
    @IsIn(['REMOTE', 'HYBRID', 'ONSITE'], { message: 'Préférence de lieu invalide' })
    locationPref?: string;

    @ApiPropertyOptional({ example: 'YES' })
    @IsOptional()
    @IsIn(['YES', 'NO'], { message: 'Valeur invalide pour hasCofounded' })
    hasCofounded?: string;

    @ApiPropertyOptional({ example: 'FULLTIME' })
    @IsOptional()
    @IsIn(['2-5H', '5-10H', '10-20H', 'FULLTIME'], { message: 'Disponibilité invalide' })
    availability?: string;

    @ApiPropertyOptional({ example: ['TECH', 'IMPACT'], type: [String] })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10, { message: 'Maximum 10 secteurs' })
    @IsIn(['TECH', 'HYBRID', 'IMPACT', 'ANY'], { each: true, message: 'Type de projet invalide' })
    projectPref?: string[];

    @ApiPropertyOptional({ description: 'Resume URL' })
    @IsOptional()
    @IsUrl({}, { message: 'URL CV invalide' })
    @MaxLength(500)
    resumeUrl?: string;
}
