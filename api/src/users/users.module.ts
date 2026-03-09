import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { AiService } from '../projects/ai.service';

@Module({
    imports: [PrismaModule, UploadModule],
    controllers: [UsersController],
    providers: [UsersService, AiService],
    exports: [UsersService],
})
export class UsersModule { }
