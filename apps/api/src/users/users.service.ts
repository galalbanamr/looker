import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface UpdateProfileDto {
    fullName?: string;
    bio?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    location?: string;
    website?: string;
    githubUrl?: string;
    linkedinUrl?: string;
    isPublic?: boolean;
}

export interface AddSkillDto {
    skill: string;
    proficiency?: number; // 1-5
}

export interface AddHackathonHistoryDto {
    eventName: string;
    eventDate?: string;
    role?: string;
    achievement?: string;
    projectUrl?: string;
}

export interface UserSearchFilters {
    skills?: string[];
    interests?: string[];
    location?: string;
    search?: string;
}

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    // ==========================================
    // PROFILE MANAGEMENT
    // ==========================================

    async getMyProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
                skills: true,
                interests: true,
                hackathonHistory: { orderBy: { eventDate: 'desc' } },
                teamMemberships: {
                    include: {
                        team: {
                            include: { event: { select: { id: true, title: true } } },
                        },
                    },
                },
                _count: {
                    select: { savedEvents: true, teamMemberships: true },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async getPublicProfile(username: string, viewerId?: string) {
        const user = await this.prisma.user.findUnique({
            where: { username },
            include: {
                profile: true,
                skills: true,
                interests: true,
                hackathonHistory: { orderBy: { eventDate: 'desc' } },
                _count: {
                    select: { teamMemberships: true },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Log profile view if viewer is different user
        if (viewerId && viewerId !== user.id) {
            await this.prisma.profileView.create({
                data: {
                    viewerId,
                    viewedId: user.id,
                },
            }).catch(() => { }); // Ignore errors
        }

        // Hide sensitive data for non-public profiles
        if (!user.profile?.isPublic) {
            return {
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                profile: user.profile ? { avatarUrl: user.profile.avatarUrl } : null,
                isPublic: false,
            };
        }

        // Remove sensitive fields
        const { email, passwordHash, ...publicUser } = user as any;
        return publicUser;
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        // Update user's full name if provided
        if (dto.fullName !== undefined) {
            await this.prisma.user.update({
                where: { id: userId },
                data: { fullName: dto.fullName },
            });
        }

        // Upsert profile
        return this.prisma.userProfile.upsert({
            where: { userId },
            create: {
                userId,
                bio: dto.bio,
                avatarUrl: dto.avatarUrl,
                bannerUrl: dto.bannerUrl,
                location: dto.location,
                website: dto.website,
                githubUrl: dto.githubUrl,
                linkedinUrl: dto.linkedinUrl,
                isPublic: dto.isPublic ?? false,
            },
            update: {
                ...(dto.bio !== undefined && { bio: dto.bio }),
                ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
                ...(dto.bannerUrl !== undefined && { bannerUrl: dto.bannerUrl }),
                ...(dto.location !== undefined && { location: dto.location }),
                ...(dto.website !== undefined && { website: dto.website }),
                ...(dto.githubUrl !== undefined && { githubUrl: dto.githubUrl }),
                ...(dto.linkedinUrl !== undefined && { linkedinUrl: dto.linkedinUrl }),
                ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
            },
        });
    }

    // ==========================================
    // SKILLS MANAGEMENT
    // ==========================================

    async addSkill(userId: string, dto: AddSkillDto) {
        const proficiency = Math.min(5, Math.max(1, dto.proficiency || 3));

        return this.prisma.userSkill.upsert({
            where: { userId_skill: { userId, skill: dto.skill } },
            create: { userId, skill: dto.skill, proficiency },
            update: { proficiency },
        });
    }

    async removeSkill(userId: string, skill: string) {
        await this.prisma.userSkill.delete({
            where: { userId_skill: { userId, skill } },
        }).catch(() => { });
        return { success: true };
    }

    async getSkills(userId: string) {
        return this.prisma.userSkill.findMany({
            where: { userId },
            orderBy: { proficiency: 'desc' },
        });
    }

    // ==========================================
    // INTERESTS MANAGEMENT
    // ==========================================

    async addInterest(userId: string, interest: string) {
        return this.prisma.userInterest.upsert({
            where: { userId_interest: { userId, interest } },
            create: { userId, interest },
            update: {},
        });
    }

    async removeInterest(userId: string, interest: string) {
        await this.prisma.userInterest.delete({
            where: { userId_interest: { userId, interest } },
        }).catch(() => { });
        return { success: true };
    }

    async getInterests(userId: string) {
        return this.prisma.userInterest.findMany({ where: { userId } });
    }

    // ==========================================
    // HACKATHON HISTORY
    // ==========================================

    async addHackathonHistory(userId: string, dto: AddHackathonHistoryDto) {
        return this.prisma.userHackathonHistory.create({
            data: {
                userId,
                eventName: dto.eventName,
                eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
                role: dto.role,
                achievement: dto.achievement,
                projectUrl: dto.projectUrl,
            },
        });
    }

    async updateHackathonHistory(userId: string, historyId: string, dto: AddHackathonHistoryDto) {
        const history = await this.prisma.userHackathonHistory.findFirst({
            where: { id: historyId, userId },
        });
        if (!history) {
            throw new NotFoundException('History entry not found');
        }

        return this.prisma.userHackathonHistory.update({
            where: { id: historyId },
            data: {
                eventName: dto.eventName,
                eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
                role: dto.role,
                achievement: dto.achievement,
                projectUrl: dto.projectUrl,
            },
        });
    }

    async deleteHackathonHistory(userId: string, historyId: string) {
        await this.prisma.userHackathonHistory.deleteMany({
            where: { id: historyId, userId },
        });
        return { success: true };
    }

    // ==========================================
    // USER SEARCH / BROWSE
    // ==========================================

    async searchUsers(filters: UserSearchFilters, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = {
            profile: { isPublic: true },
        };

        if (filters.search) {
            where.OR = [
                { username: { contains: filters.search, mode: 'insensitive' } },
                { fullName: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        if (filters.location) {
            where.profile = {
                ...(where.profile as any),
                location: { contains: filters.location, mode: 'insensitive' },
            };
        }

        if (filters.skills && filters.skills.length > 0) {
            where.skills = {
                some: { skill: { in: filters.skills } },
            };
        }

        if (filters.interests && filters.interests.length > 0) {
            where.interests = {
                some: { interest: { in: filters.interests } },
            };
        }

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    profile: { select: { avatarUrl: true, location: true, bio: true } },
                    skills: { take: 5, orderBy: { proficiency: 'desc' } },
                    interests: { take: 5 },
                    _count: { select: { hackathonHistory: true, teamMemberships: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getPopularSkills(limit = 20) {
        const skills = await this.prisma.userSkill.groupBy({
            by: ['skill'],
            _count: { skill: true },
            orderBy: { _count: { skill: 'desc' } },
            take: limit,
        });

        return skills.map(s => ({ skill: s.skill, count: s._count.skill }));
    }

    async getPopularInterests(limit = 20) {
        const interests = await this.prisma.userInterest.groupBy({
            by: ['interest'],
            _count: { interest: true },
            orderBy: { _count: { interest: 'desc' } },
            take: limit,
        });

        return interests.map(i => ({ interest: i.interest, count: i._count.interest }));
    }
}
