import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';

export enum UserRole {
    ADMIN = 'ADMIN',
    FOUNDER = 'FOUNDER',
    CANDIDATE = 'CANDIDATE',
    USER = 'USER',
}

export class UpdateUserProfileDto {
    @ApiProperty({ enum: UserRole, description: 'The role of the user' })
    @IsEnum(UserRole)
    @IsOptional()
    role?: UserRole;

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
