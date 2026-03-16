import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class SearchQueryDto {
    @IsString()
    @MinLength(2)
    @MaxLength(200)
    q: string;
}

export class SemanticSearchQueryDto {
    @IsString()
    @MinLength(2)
    @MaxLength(200)
    q: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    sector?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    city?: string;
}
