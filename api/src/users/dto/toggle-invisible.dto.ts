import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleInvisibleDto {
    @ApiProperty({ description: 'Enable or disable invisible mode' })
    @IsBoolean({ message: 'invisible doit être un booléen' })
    invisible: boolean;
}
