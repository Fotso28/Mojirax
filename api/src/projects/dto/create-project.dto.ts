import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray } from 'class-validator';

export class CreateProjectDto {
    // Step 1: Identity
    @ApiProperty({ description: 'Name of the project' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Short pitch / punchline' })
    @IsString()
    pitch: string;

    @ApiProperty({ description: 'Country', required: false })
    @IsString()
    @IsOptional()
    country?: string;

    @ApiProperty({ description: 'City', required: false })
    @IsString()
    @IsOptional()
    city?: string;

    @ApiProperty({ description: 'Location (city, country)', required: false })
    @IsString()
    @IsOptional()
    location?: string;

    // Step 2: Details
    @ApiProperty({ description: 'Scope: LOCAL, DIASPORA, HYBRID', required: false })
    @IsString()
    @IsOptional()
    scope?: string;

    @ApiProperty({ description: 'Sector: FINTECH, AGRITECH, HEALTH, etc.', required: false })
    @IsString()
    @IsOptional()
    sector?: string;

    @ApiProperty({ description: 'Stage: IDEA, PROTOTYPE, MVP_BUILD, etc.', required: false })
    @IsString()
    @IsOptional()
    stage?: string;

    // Step 3: Problem
    @ApiProperty({ description: 'Problem description', required: false })
    @IsString()
    @IsOptional()
    problem?: string;

    @ApiProperty({ description: 'Target persona', required: false })
    @IsString()
    @IsOptional()
    target?: string;

    @ApiProperty({ description: 'Current solutions used by target', required: false })
    @IsString()
    @IsOptional()
    solution_current?: string;

    // Step 4: Solution
    @ApiProperty({ description: 'Solution description', required: false })
    @IsString()
    @IsOptional()
    solution_desc?: string;

    @ApiProperty({ description: 'Unique Value Proposition', required: false })
    @IsString()
    @IsOptional()
    uvp?: string;

    @ApiProperty({ description: 'What you do NOT do (anti-scope)', required: false })
    @IsString()
    @IsOptional()
    anti_scope?: string;

    // Step 5: Market
    @ApiProperty({ description: 'Market type: B2C, B2B, B2G, MARKETPLACE', required: false })
    @IsString()
    @IsOptional()
    market_type?: string;

    @ApiProperty({ description: 'Business model: SUBSCRIPTION, COMMISSION, etc.', required: false })
    @IsString()
    @IsOptional()
    business_model?: string;

    @ApiProperty({ description: 'Competitors description', required: false })
    @IsString()
    @IsOptional()
    competitors?: string;

    // Step 6: Traction
    @ApiProperty({ description: 'Founder role: CEO, CTO, CPO, CMO, COO', required: false })
    @IsString()
    @IsOptional()
    founder_role?: string;

    @ApiProperty({ description: 'Time availability: 2-5H, 5-10H, 10-20H, FULLTIME', required: false })
    @IsString()
    @IsOptional()
    time_availability?: string;

    @ApiProperty({ description: 'Traction proof', required: false })
    @IsString()
    @IsOptional()
    traction?: string;

    // Step 7: Cofounder
    @ApiProperty({ description: 'Profile sought: TECH, BIZ, PRODUCT, FINANCE', required: false })
    @IsString()
    @IsOptional()
    looking_for_role?: string;

    @ApiProperty({ description: 'Collaboration type: EQUITY, PAID, HYBRID', required: false })
    @IsString()
    @IsOptional()
    collab_type?: string;

    @ApiProperty({ description: 'Vision at 3 years', required: false })
    @IsString()
    @IsOptional()
    vision?: string;

    // Legacy fields
    @ApiProperty({ description: 'Full description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Required skills', required: false, type: [String] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    requiredSkills?: string[];
}
