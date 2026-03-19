import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * CreateFromDocumentDto — typed DTO for the POST /projects/from-document endpoint.
 * Replaces the inline `{ name, pitch, country?, city?, location?, logoBase64? }` body type.
 */
export class CreateFromDocumentDto {
    @ApiProperty({ description: 'Name of the project' })
    @IsString()
    @IsNotEmpty({ message: 'Le nom du projet est obligatoire.' })
    @MaxLength(120)
    name: string;

    @ApiProperty({ description: 'Short pitch / punchline' })
    @IsString()
    @IsNotEmpty({ message: 'Le pitch est obligatoire.' })
    @MaxLength(300)
    pitch: string;

    @ApiProperty({ description: 'Country', required: false })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    country?: string;

    @ApiProperty({ description: 'City', required: false })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    city?: string;

    @ApiProperty({ description: 'Location (city, country)', required: false })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    location?: string;

    @ApiProperty({ description: 'Logo as base64 data URL', required: false })
    @IsString()
    @IsOptional()
    @MaxLength(2_000_000)
    logoBase64?: string;
}
