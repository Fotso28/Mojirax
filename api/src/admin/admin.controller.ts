import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';
import { PushService } from '../notifications/push.service';
import {
  ListUsersDto,
  ListModerationDto,
  ModerationActionDto,
  ChangeRoleDto,
  ListTransactionsDto,
  ListLogsDto,
  ListProjectsDto,
} from './dto/admin.dto';
import { UpdateEmailConfigDto } from './dto/update-email-config.dto';
import { UpdatePushConfigDto } from './dto/update-push-config.dto';

@Controller('admin')
@UseGuards(FirebaseAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly pushService: PushService,
  ) {}

  @Get('kpis')
  getKpis() {
    return this.adminService.getKpis();
  }

  @Get('users')
  listUsers(@Query() dto: ListUsersDto) {
    return this.adminService.listUsers(dto);
  }

  @Get('users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/role')
  changeUserRole(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.adminService.changeUserRole(req.user.dbId, id, dto);
  }

  @Get('moderation')
  listModeration(@Query() dto: ListModerationDto) {
    return this.adminService.listModeration(dto);
  }

  @Patch('moderation/:id')
  moderateItem(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ModerationActionDto,
  ) {
    return this.adminService.moderateItem(req.user.dbId, id, dto);
  }

  @Get('transactions')
  listTransactions(@Query() dto: ListTransactionsDto) {
    return this.adminService.listTransactions(dto);
  }

  @Get('logs')
  listLogs(@Query() dto: ListLogsDto) {
    return this.adminService.listLogs(dto);
  }

  @Get('projects')
  listProjects(@Query() dto: ListProjectsDto) {
    return this.adminService.listProjects(dto);
  }

  // ─── Push Config ──────────────────────────────────

  @Get('push-config')
  getPushConfig() {
    return this.adminService.getPushConfig();
  }

  @Patch('push-config')
  updatePushConfig(@Body() dto: UpdatePushConfigDto) {
    return this.adminService.updatePushConfig(dto);
  }

  // ─── Email Config ──────────────────────────────────

  @Get('email-config')
  getEmailConfig() {
    return this.adminService.getEmailConfig();
  }

  @Patch('email-config')
  updateEmailConfig(@Body() dto: UpdateEmailConfigDto) {
    return this.adminService.updateEmailConfig(dto);
  }
}
