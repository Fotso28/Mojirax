import { IsOptional, IsString, IsBooleanString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindNotificationsDto {
    @ApiPropertyOptional({ description: 'Filtrer uniquement les non-lues' })
    @IsOptional()
    @IsBooleanString()
    unreadOnly?: string;

    @ApiPropertyOptional({ description: 'Cursor pour la pagination (id de la dernière notification)' })
    @IsOptional()
    @IsString()
    cursor?: string;

    @ApiPropertyOptional({ description: 'Nombre de résultats (max 20)', default: 20 })
    @IsOptional()
    @IsString()
    limit?: string;
}
