import { IsObject, IsOptional, IsInt, Min } from 'class-validator';

/**
 * DTO for PATCH /users/onboarding — saves the onboarding wizard state.
 * Mirrors SaveProjectDraftDto pattern for free-form JSON wizard state.
 */
export class SaveOnboardingStateDto {
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown> | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  step?: number;
}
