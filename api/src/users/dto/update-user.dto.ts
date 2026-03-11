import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';

// Rôles autorisés pour l'auto-assignation (onboarding)
// ADMIN est exclu — seul un admin peut promouvoir via PATCH /admin/users/:id/role
export enum SelfAssignableRole {
    FOUNDER = 'FOUNDER',
    CANDIDATE = 'CANDIDATE',
}

export class UpdateUserProfileDto {
    @ApiProperty({ enum: SelfAssignableRole, description: 'The role of the user (FOUNDER or CANDIDATE only)' })
    @IsEnum(SelfAssignableRole, { message: 'Le rôle doit être FOUNDER ou CANDIDATE' })
    @IsOptional()
    role?: SelfAssignableRole;

    @ApiProperty({ description: 'First name of the user', required: false })
    @IsString()
    @IsOptional()
    firstName?: string;

    @ApiProperty({ description: 'Last name of the user', required: false })
    @IsString()
    @IsOptional()
    lastName?: string;

    @ApiProperty({ description: 'Email address', required: false })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiProperty({ description: 'Phone number', required: false })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({ description: 'Address', required: false })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ description: 'Profile image URL', required: false })
    @IsUrl()
    @IsOptional()
    image?: string;

    @ApiProperty({ description: 'Founder profile data (JSON)', required: false })
    @IsObject()
    @IsOptional()
    founderProfile?: Record<string, any>;
}
