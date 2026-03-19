import { PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';

/**
 * ValidateProjectDto — used for AI validation of project data.
 * All fields are optional (PartialType) since the AI review step
 * accepts any subset of the ALLOWED_FIELDS from the wizard.
 *
 * ALLOWED_FIELDS (from ai-review.tsx):
 *   name, pitch, country, city, location, scope, sector, stage,
 *   problem, target, solution_current, solution_desc, uvp, anti_scope,
 *   market_type, business_model, competitors, founder_role, time_availability,
 *   traction, looking_for_role, collab_type, vision, description, requiredSkills
 */
export class ValidateProjectDto extends PartialType(CreateProjectDto) {}
