import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
    constructor(private adminService: AdminService) { }

    // ==========================================
    // DASHBOARD
    // ==========================================

    @Get('dashboard')
    async getDashboard(@Req() req: Request & { user: { userId: string } }) {
        await this.adminService.verifyAdmin(req.user.userId);

        const [stats, userGrowth, eventsByType, recentActivity] = await Promise.all([
            this.adminService.getDashboardStats(),
            this.adminService.getUserGrowthData(30),
            this.adminService.getEventsByType(),
            this.adminService.getRecentActivity(10),
        ]);

        return { stats, userGrowth, eventsByType, recentActivity };
    }

    @Get('analytics/overview')
    async getAnalyticsOverview(@Req() req: Request & { user: { userId: string } }) {
        await this.adminService.verifyAdmin(req.user.userId);
        return this.adminService.getDashboardStats();
    }

    @Get('analytics/user-growth')
    async getUserGrowth(
        @Req() req: Request & { user: { userId: string } },
        @Query('days') days?: string,
    ) {
        await this.adminService.verifyAdmin(req.user.userId);
        return this.adminService.getUserGrowthData(days ? parseInt(days) : 30);
    }

    @Get('analytics/events-by-type')
    async getEventsByType(@Req() req: Request & { user: { userId: string } }) {
        await this.adminService.verifyAdmin(req.user.userId);
        return this.adminService.getEventsByType();
    }

    // ==========================================
    // USER MANAGEMENT
    // ==========================================

    @Get('users')
    async getUsers(
        @Req() req: Request & { user: { userId: string } },
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
    ) {
        await this.adminService.verifyAdmin(req.user.userId);
        return this.adminService.getUsers(
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
            search,
        );
    }

    @Get('users/:id')
    async getUserDetails(
        @Req() req: Request & { user: { userId: string } },
        @Param('id') id: string,
    ) {
        await this.adminService.verifyAdmin(req.user.userId);
        return this.adminService.getUserDetails(id);
    }

    @Delete('users/:id')
    async deleteUser(
        @Req() req: Request & { user: { userId: string } },
        @Param('id') id: string,
    ) {
        await this.adminService.verifyAdmin(req.user.userId);
        await this.adminService.logAction(req.user.userId, 'deleted_user', 'user', id);
        return this.adminService.deleteUser(id);
    }

    // ==========================================
    // AUDIT LOGS
    // ==========================================

    @Get('audit-logs')
    async getAuditLogs(
        @Req() req: Request & { user: { userId: string } },
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('adminId') adminId?: string,
    ) {
        await this.adminService.verifyAdmin(req.user.userId);
        return this.adminService.getAuditLogs(
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 50,
            adminId,
        );
    }

    // ==========================================
    // ADMIN ROLE MANAGEMENT
    // ==========================================

    @Post('grant-role')
    async grantAdminRole(
        @Req() req: Request & { user: { userId: string } },
        @Body() body: { userId: string; role?: 'admin' | 'super_admin' },
    ) {
        return this.adminService.grantAdminRole(req.user.userId, body.userId, body.role);
    }

    @Post('revoke-role/:userId')
    async revokeAdminRole(
        @Req() req: Request & { user: { userId: string } },
        @Param('userId') targetUserId: string,
    ) {
        return this.adminService.revokeAdminRole(req.user.userId, targetUserId);
    }
}
