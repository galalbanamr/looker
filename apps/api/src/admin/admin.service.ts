import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    // ==========================================
    // ADMIN VERIFICATION
    // ==========================================

    async isAdmin(userId: string): Promise<boolean> {
        const admin = await this.prisma.adminUser.findUnique({ where: { userId } });
        return !!admin;
    }

    async verifyAdmin(userId: string) {
        const admin = await this.prisma.adminUser.findUnique({ where: { userId } });
        if (!admin) {
            throw new ForbiddenException('Admin access required');
        }
        return admin;
    }

    // ==========================================
    // DASHBOARD ANALYTICS
    // ==========================================

    async getDashboardStats() {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [
            totalUsers,
            totalEvents,
            totalTeams,
            pendingEvents,
            newUsersThisWeek,
            newUsersThisMonth,
            activeTeams,
        ] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.event.count(),
            this.prisma.team.count(),
            this.prisma.event.count({ where: { isVerified: false } }),
            this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
            this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
            this.prisma.team.count({ where: { isOpen: true } }),
        ]);

        return {
            totalUsers,
            totalEvents,
            totalTeams,
            pendingEvents,
            newUsersThisWeek,
            newUsersThisMonth,
            activeTeams,
        };
    }

    async getUserGrowthData(days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const users = await this.prisma.user.findMany({
            where: { createdAt: { gte: startDate } },
            select: { createdAt: true },
            orderBy: { createdAt: 'asc' },
        });

        // Group by day
        const groupedByDay: Record<string, number> = {};
        users.forEach(user => {
            const day = user.createdAt.toISOString().split('T')[0];
            groupedByDay[day] = (groupedByDay[day] || 0) + 1;
        });

        return Object.entries(groupedByDay).map(([date, count]) => ({ date, count }));
    }

    async getEventsByType() {
        const events = await this.prisma.event.groupBy({
            by: ['eventType'],
            _count: { eventType: true },
        });

        return events.map(e => ({ type: e.eventType, count: e._count.eventType }));
    }

    async getRecentActivity(limit = 10) {
        const [recentUsers, recentEvents, recentTeams] = await Promise.all([
            this.prisma.user.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, username: true, createdAt: true },
            }),
            this.prisma.event.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, title: true, createdAt: true },
            }),
            this.prisma.team.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, name: true, createdAt: true },
            }),
        ]);

        // Combine and sort by createdAt
        const activities = [
            ...recentUsers.map(u => ({ type: 'user_joined', message: `User "${u.username}" joined`, createdAt: u.createdAt })),
            ...recentEvents.map(e => ({ type: 'event_created', message: `Event "${e.title}" created`, createdAt: e.createdAt })),
            ...recentTeams.map(t => ({ type: 'team_formed', message: `Team "${t.name}" formed`, createdAt: t.createdAt })),
        ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);

        return activities;
    }

    // ==========================================
    // USER MANAGEMENT
    // ==========================================

    async getUsers(page = 1, limit = 20, search?: string) {
        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = search ? {
            OR: [
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { fullName: { contains: search, mode: 'insensitive' } },
            ],
        } : {};

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    username: true,
                    fullName: true,
                    createdAt: true,
                    _count: { select: { teamMemberships: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count({ where }),
        ]);

        return { users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    async getUserDetails(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
                skills: true,
                interests: true,
                teamMemberships: { include: { team: true } },
                hackathonHistory: true,
                adminRole: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async deleteUser(userId: string) {
        await this.prisma.user.delete({ where: { id: userId } });
        return { success: true };
    }

    // ==========================================
    // AUDIT LOGGING
    // ==========================================

    async logAction(
        adminId: string,
        action: string,
        resourceType: string,
        resourceId?: string,
        changes?: Record<string, any>,
        ipAddress?: string,
    ) {
        return this.prisma.adminAuditLog.create({
            data: {
                adminId,
                action,
                resourceType,
                resourceId,
                changes: changes as Prisma.JsonObject | undefined,
                ipAddress,
            },
        });
    }

    async getAuditLogs(page = 1, limit = 50, adminId?: string) {
        const skip = (page - 1) * limit;
        const where: Prisma.AdminAuditLogWhereInput = adminId ? { adminId } : {};

        const [logs, total] = await Promise.all([
            this.prisma.adminAuditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.adminAuditLog.count({ where }),
        ]);

        return { logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    // ==========================================
    // ADMIN USER MANAGEMENT
    // ==========================================

    async grantAdminRole(granterId: string, targetUserId: string, role: 'admin' | 'super_admin' = 'admin') {
        // Verify granter is super_admin
        const granter = await this.prisma.adminUser.findUnique({ where: { userId: granterId } });
        if (!granter || granter.role !== 'super_admin') {
            throw new ForbiddenException('Only super admins can grant admin roles');
        }

        return this.prisma.adminUser.upsert({
            where: { userId: targetUserId },
            create: { userId: targetUserId, role, grantedBy: granterId },
            update: { role, grantedBy: granterId },
        });
    }

    async revokeAdminRole(granterId: string, targetUserId: string) {
        const granter = await this.prisma.adminUser.findUnique({ where: { userId: granterId } });
        if (!granter || granter.role !== 'super_admin') {
            throw new ForbiddenException('Only super admins can revoke admin roles');
        }

        await this.prisma.adminUser.delete({ where: { userId: targetUserId } });
        return { success: true };
    }
}
