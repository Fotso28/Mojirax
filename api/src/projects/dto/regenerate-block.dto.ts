import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

export class RegenerateBlockDto {
    @ApiProperty({
        description: 'Block key to regenerate',
        enum: ['problem', 'solution', 'market', 'traction', 'team', 'cofounder'],
    })
    @IsString()
    @IsIn(['problem', 'solution', 'market', 'traction', 'team', 'cofounder'])
    blockKey: string;
}
