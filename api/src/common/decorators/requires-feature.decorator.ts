import { SetMetadata } from '@nestjs/common';
import { REQUIRED_FEATURE_KEY } from '../guards/feature-flag.guard';

export const RequiresFeature = (featureKey: string) => SetMetadata(REQUIRED_FEATURE_KEY, featureKey);
