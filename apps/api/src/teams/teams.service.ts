import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateTeamDto {
    eventId?: string;
    name: string;
    description?: string;
    maxMembers?: number;
    lookingForSkills?: string[];
    isPublic?: boolean;
}

export interface UpdateTeamDto {
    name?: string;
    description?: string;
    maxMembers?: number;
    lookingForSkills?: string[];
    isPublic?: boolean;
    isOpen?: boolean;
}

export interface InviteUserDto {
    username: string;
    message?: string;
}

@Injectable()
export class TeamsService {
    constructor(private prisma: PrismaService) { }

    // ==========================================
    // TEAM CRUD
    // ==========================================

    async createTeam(userId: string, dto: CreateTeamDto) {
        // Verify event exists if eventId provided
        if (dto.eventId) {
            const event = await this.prisma.event.findUnique({ where: { id: dto.eventId } });
            if (!event) {
                throw new BadRequestException('Event not found');
            }
        }

        // Create team with creator as leader
        const team = await this.prisma.team.create({
            data: {
                eventId: dto.eventId,
                name: dto.name,
                description: dto.description,
                maxMembers: dto.maxMembers || 4,
                lookingForSkills: dto.lookingForSkills || [],
                isPublic: dto.isPublic ?? true,
                members: {
                    create: {
                        userId,
                        role: 'leader',
                    },
                },
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, username: true, fullName: true, profile: { select: { avatarUrl: true } } },
                        },
                    },
                },
                event: { select: { id: true, title: true } },
            },
        });

        return team;
    }

    async getTeamById(teamId: string) {
        const team = await this.prisma.team.findUnique({
            where: { id: teamId },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                fullName: true,
                                profile: { select: { avatarUrl: true, location: true } },
                                skills: { take: 5, orderBy: { proficiency: 'desc' } },
                            },
                        },
                    },
                },
                event: true,
                invitations: {
                    where: { status: 'pending' },
                    include: {
                        invitee: { select: { id: true, username: true, fullName: true } },
                    },
                },
                _count: { select: { messages: true } },
            },
        });

        if (!team) {
            throw new NotFoundException('Team not found');
        }

        return team;
    }

    async updateTeam(userId: string, teamId: string, dto: UpdateTeamDto) {
        const team = await this.verifyLeader(userId, teamId);

        return this.prisma.team.update({
            where: { id: teamId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.maxMembers && { maxMembers: dto.maxMembers }),
                ...(dto.lookingForSkills && { lookingForSkills: dto.lookingForSkills }),
                ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
                ...(dto.isOpen !== undefined && { isOpen: dto.isOpen }),
            },
        });
    }

    async deleteTeam(userId: string, teamId: string) {
        await this.verifyLeader(userId, teamId);
        await this.prisma.team.delete({ where: { id: teamId } });
        return { success: true };
    }

    // ==========================================
    // INVITATION SYSTEM
    // ==========================================

    async inviteUser(userId: string, teamId: string, dto: InviteUserDto) {
        await this.verifyLeader(userId, teamId);

        // Find invitee by username
        const invitee = await this.prisma.user.findUnique({
            where: { username: dto.username },
        });
        if (!invitee) {
            throw new BadRequestException('User not found');
        }

        // Check if user is already a member
        const existingMember = await this.prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId: invitee.id } },
        });
        if (existingMember) {
            throw new BadRequestException('User is already a team member');
        }

        // Check for existing pending invitation
        const existingInvite = await this.prisma.teamInvitation.findUnique({
            where: { teamId_inviteeId: { teamId, inviteeId: invitee.id } },
        });
        if (existingInvite && existingInvite.status === 'pending') {
            throw new BadRequestException('Invitation already sent');
        }

        // Create or update invitation
        return this.prisma.teamInvitation.upsert({
            where: { teamId_inviteeId: { teamId, inviteeId: invitee.id } },
            create: {
                teamId,
                inviterId: userId,
                inviteeId: invitee.id,
                message: dto.message,
            },
            update: {
                status: 'pending',
                message: dto.message,
                inviterId: userId,
                respondedAt: null,
            },
            include: {
                team: { select: { name: true } },
                invitee: { select: { username: true, fullName: true } },
            },
        });
    }

    async acceptInvitation(userId: string, invitationId: string) {
        const invitation = await this.prisma.teamInvitation.findFirst({
            where: { id: invitationId, inviteeId: userId, status: 'pending' },
            include: { team: true },
        });

        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        // Check team capacity
        const memberCount = await this.prisma.teamMember.count({
            where: { teamId: invitation.teamId },
        });
        if (memberCount >= invitation.team.maxMembers) {
            throw new BadRequestException('Team is full');
        }

        // Accept invitation and add as member
        await this.prisma.$transaction([
            this.prisma.teamInvitation.update({
                where: { id: invitationId },
                data: { status: 'accepted', respondedAt: new Date() },
            }),
            this.prisma.teamMember.create({
                data: { teamId: invitation.teamId, userId, role: 'member' },
            }),
        ]);

        return { success: true, teamId: invitation.teamId };
    }

    async rejectInvitation(userId: string, invitationId: string) {
        const invitation = await this.prisma.teamInvitation.findFirst({
            where: { id: invitationId, inviteeId: userId, status: 'pending' },
        });

        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        await this.prisma.teamInvitation.update({
            where: { id: invitationId },
            data: { status: 'rejected', respondedAt: new Date() },
        });

        return { success: true };
    }

    async getMyInvitations(userId: string) {
        return this.prisma.teamInvitation.findMany({
            where: { inviteeId: userId, status: 'pending' },
            include: {
                team: {
                    include: {
                        event: { select: { id: true, title: true } },
                        members: {
                            include: {
                                user: { select: { id: true, username: true, fullName: true, profile: { select: { avatarUrl: true } } } },
                            },
                        },
                    },
                },
                inviter: { select: { username: true, fullName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ==========================================
    // MEMBER MANAGEMENT
    // ==========================================

    async removeMember(userId: string, teamId: string, memberUserId: string) {
        await this.verifyLeader(userId, teamId);

        if (userId === memberUserId) {
            throw new BadRequestException('Cannot remove yourself. Use leave team instead.');
        }

        await this.prisma.teamMember.delete({
            where: { teamId_userId: { teamId, userId: memberUserId } },
        });

        return { success: true };
    }

    async leaveTeam(userId: string, teamId: string) {
        const member = await this.prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId } },
        });

        if (!member) {
            throw new NotFoundException('You are not a member of this team');
        }

        if (member.role === 'leader') {
            // Find another member to promote or delete team
            const otherMembers = await this.prisma.teamMember.findMany({
                where: { teamId, userId: { not: userId } },
                orderBy: { joinedAt: 'asc' },
            });

            if (otherMembers.length > 0) {
                // Promote oldest member to leader
                await this.prisma.$transaction([
                    this.prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } }),
                    this.prisma.teamMember.update({
                        where: { teamId_userId: { teamId, userId: otherMembers[0].userId } },
                        data: { role: 'leader' },
                    }),
                ]);
            } else {
                // No other members, delete team
                await this.prisma.team.delete({ where: { id: teamId } });
            }
        } else {
            await this.prisma.teamMember.delete({
                where: { teamId_userId: { teamId, userId } },
            });
        }

        return { success: true };
    }

    // ==========================================
    // TEAM QUERIES
    // ==========================================

    async getMyTeams(userId: string) {
        return this.prisma.team.findMany({
            where: {
                members: { some: { userId } },
            },
            include: {
                event: { select: { id: true, title: true, startDate: true } },
                members: {
                    include: {
                        user: { select: { id: true, username: true, fullName: true, profile: { select: { avatarUrl: true } } } },
                    },
                },
                _count: { select: { messages: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }

    async getTeamsForEvent(eventId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [teams, total] = await Promise.all([
            this.prisma.team.findMany({
                where: { eventId, isPublic: true },
                skip,
                take: limit,
                include: {
                    members: {
                        include: {
                            user: { select: { id: true, username: true, fullName: true, profile: { select: { avatarUrl: true } } } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.team.count({ where: { eventId, isPublic: true } }),
        ]);

        return {
            teams,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    // ==========================================
    // HELPERS
    // ==========================================

    private async verifyLeader(userId: string, teamId: string) {
        const member = await this.prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId } },
            include: { team: true },
        });

        if (!member) {
            throw new NotFoundException('Team not found');
        }

        if (member.role !== 'leader') {
            throw new ForbiddenException('Only team leader can perform this action');
        }

        return member.team;
    }
}
