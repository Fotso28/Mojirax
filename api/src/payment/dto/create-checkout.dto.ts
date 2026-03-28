import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty({ description: 'ID du PricingPlan en base de données', example: 'plan_pro' })
  @IsString()
  planId: string;
}
