import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateProfileInput {
    name: string;
    keywords: string[];
    location?: string;
    frequencyPerDay?: number;
    quietHoursStart?: number;
    quietHoursEnd?: number;
    maxResultsPerRun?: number;
    notificationMode?: 'immediate' | 'digest';
    digestTime?: string;
    whatsappNumber: string;
}

type UpdateProfileInput = Partial<CreateProfileInput>;

@Injectable()
export class ProfilesService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, data: CreateProfileInput) {
        return this.prisma.searchProfile.create({
            data: {
                ...data,
                userId,
            },
        });
    }

    async findAll(userId: string) {
        return this.prisma.searchProfile.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { items: true, runs: true },
                },
            },
        });
    }

    async findOne(id: string, userId: string) {
        const profile = await this.prisma.searchProfile.findUnique({
            where: { id },
            include: {
                items: {
                    orderBy: { discoveredAt: 'desc' },
                    take: 20,
                },
                runs: {
                    orderBy: { startedAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!profile) throw new NotFoundException('Profile not found');
        if (profile.userId !== userId) throw new ForbiddenException('Access denied');

        return profile;
    }

    async update(id: string, userId: string, data: UpdateProfileInput) {
        await this.findOne(id, userId);
        return this.prisma.searchProfile.update({
            where: { id },
            data,
        });
    }

    async delete(id: string, userId: string) {
        await this.findOne(id, userId);
        return this.prisma.searchProfile.delete({ where: { id } });
    }

    async toggle(id: string, userId: string) {
        const profile = await this.findOne(id, userId);
        return this.prisma.searchProfile.update({
            where: { id },
            data: { isActive: !profile.isActive },
        });
    }

    async getStats(userId: string) {
        const profiles = await this.prisma.searchProfile.count({
            where: { userId },
        });

        const activeProfiles = await this.prisma.searchProfile.count({
            where: { userId, isActive: true },
        });

        const totalItems = await this.prisma.discoveredItem.count({
            where: { profile: { userId } },
        });

        const notifiedItems = await this.prisma.discoveredItem.count({
            where: { profile: { userId }, notified: true },
        });

        const recentRuns = await this.prisma.searchRun.findMany({
            where: { profile: { userId } },
            orderBy: { startedAt: 'desc' },
            take: 5,
            include: {
                profile: { select: { name: true } },
            },
        });

        return {
            profiles,
            activeProfiles,
            totalItems,
            notifiedItems,
            recentRuns,
        };
    }
}
