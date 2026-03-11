import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AiConfigService } from './ai-config.service';
import {
  UpdateAiConfigDto,
  UpdatePromptDto,
  RollbackPromptDto,
  ListAiLogsDto,
  AnalyticsPeriodDto,
} from './dto/ai-config.dto';

@Controller('admin/ai')
@UseGuards(FirebaseAuthGuard, AdminGuard)
export class AiConfigController {
  constructor(private readonly aiConfigService: AiConfigService) {}

  @Get('config')
  getConfig() {
    return this.aiConfigService.getConfig();
  }

  @Patch('config')
  updateConfig(@Body() dto: UpdateAiConfigDto) {
    return this.aiConfigService.updateConfig(dto);
  }

  @Get('prompts')
  getPrompts() {
    return this.aiConfigService.getPrompts();
  }

  @Get('prompts/:action')
  getPromptDetail(@Param('action') action: string) {
    return this.aiConfigService.getPromptDetail(action);
  }

  @Patch('prompts/:action')
  updatePrompt(@Param('action') action: string, @Body() dto: UpdatePromptDto) {
    return this.aiConfigService.updatePrompt(action, dto);
  }

  @Post('prompts/:action/rollback')
  rollbackPrompt(@Param('action') action: string, @Body() dto: RollbackPromptDto) {
    return this.aiConfigService.rollbackPrompt(action, dto);
  }

  @Get('logs')
  getCallLogs(@Query() dto: ListAiLogsDto) {
    return this.aiConfigService.getCallLogs(dto);
  }

  @Get('analytics')
  getAnalytics(@Query() dto: AnalyticsPeriodDto) {
    return this.aiConfigService.getAnalytics(dto);
  }
}
