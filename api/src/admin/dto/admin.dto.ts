import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  take?: number = 20;
}

export class ListUsersDto extends PaginationDto {
  @IsOptional()
  @IsIn(['ADMIN', 'FOUNDER', 'CANDIDATE', 'USER'])
  role?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class ListModerationDto extends PaginationDto {
  @IsOptional()
  @IsIn(['project', 'candidate'])
  type?: 'project' | 'candidate';

  @IsOptional()
  @IsIn(['DRAFT', 'ANALYZING', 'PENDING_AI', 'PUBLISHED', 'REJECTED'])
  status?: string;
}

export class ModerationActionDto {
  @IsEnum(['PUBLISHED', 'REJECTED'])
  action: 'PUBLISHED' | 'REJECTED';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ChangeRoleDto {
  @IsEnum(['ADMIN', 'FOUNDER', 'CANDIDATE', 'USER'])
  role: 'ADMIN' | 'FOUNDER' | 'CANDIDATE' | 'USER';
}

export class ListTransactionsDto extends PaginationDto {
  @IsOptional()
  @IsIn(['PENDING', 'PAID', 'FAILED', 'REFUNDED'])
  status?: string;
}

export class ListLogsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  action?: string;
}

export class ListProjectsDto extends PaginationDto {
  @IsOptional()
  @IsIn(['DRAFT', 'ANALYZING', 'PENDING_AI', 'PUBLISHED', 'REJECTED'])
  status?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
