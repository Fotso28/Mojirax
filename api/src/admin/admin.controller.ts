import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  BanUserDto,
  UnbanUserDto,
  ArchiveProjectDto,
} from './dto/admin.dto';
import { UpdateEmailConfigDto } from './dto/update-email-config.dto';
import { UpdatePushConfigDto } from './dto/update-push-config.dto';
import { CreatePlanDto, UpdatePlanDto, ReorderPlansDto } from './dto/plan.dto';

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

  @Patch('users/:id/ban')
  async banUser(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: BanUserDto,
  ) {
    return this.adminService.banUser(req.user.dbId, id, dto);
  }

  @Patch('users/:id/unban')
  async unbanUser(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UnbanUserDto,
  ) {
    return this.adminService.unbanUser(req.user.dbId, id, dto);
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

  @Patch('projects/:id/archive')
  async archiveProject(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ArchiveProjectDto,
  ) {
    return this.adminService.archiveProject(req.user.dbId, id, dto);
  }

  @Patch('projects/:id/restore')
  async restoreProject(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.adminService.restoreProject(req.user.dbId, id);
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

  // ─── Pricing Plans ──────────────────────────────────

  @Get('plans')
  async listPlans() {
    const plans = await this.adminService.listPlans();
    return plans.map((p) => ({ ...p, price: Number(p.price) }));
  }

  @Post('plans')
  async createPlan(@Request() req, @Body() dto: CreatePlanDto) {
    const plan = await this.adminService.createPlan(dto, req.user.dbId);
    return { ...plan, price: Number(plan.price) };
  }

  @Post('plans/reorder')
  async reorderPlans(@Request() req, @Body() dto: ReorderPlansDto) {
    const plans = await this.adminService.reorderPlans(dto, req.user.dbId);
    return plans.map((p) => ({ ...p, price: Number(p.price) }));
  }

  @Patch('plans/:id')
  async updatePlan(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    const plan = await this.adminService.updatePlan(id, dto, req.user.dbId);
    return { ...plan, price: Number(plan.price) };
  }

  @Delete('plans/:id')
  async deletePlan(@Request() req, @Param('id') id: string) {
    return this.adminService.deletePlan(id, req.user.dbId);
  }
}
