import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SendMessageDto {
    content: string;
    messageType?: 'text' | 'file' | 'system';
    fileUrl?: string;
}

@Injectable()
export class ChatService {
    constructor(private prisma: PrismaService) { }

    async verifyTeamMember(userId: string, teamId: string) {
        const member = await this.prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId } },
        });
        if (!member) {
            throw new ForbiddenException('You are not a member of this team');
        }
        return member;
    }

    async sendMessage(userId: string, teamId: string, dto: SendMessageDto) {
        await this.verifyTeamMember(userId, teamId);

        const message = await this.prisma.teamMessage.create({
            data: {
                teamId,
                userId,
                content: dto.content,
                messageType: dto.messageType || 'text',
                fileUrl: dto.fileUrl,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        profile: { select: { avatarUrl: true } },
                    },
                },
            },
        });

        // Update team's updatedAt
        await this.prisma.team.update({
            where: { id: teamId },
            data: { updatedAt: new Date() },
        });

        return message;
    }

    async getMessages(userId: string, teamId: string, page = 1, limit = 50) {
        await this.verifyTeamMember(userId, teamId);

        const skip = (page - 1) * limit;

        const [messages, total] = await Promise.all([
            this.prisma.teamMessage.findMany({
                where: { teamId, isDeleted: false },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            fullName: true,
                            profile: { select: { avatarUrl: true } },
                        },
                    },
                },
            }),
            this.prisma.teamMessage.count({ where: { teamId, isDeleted: false } }),
        ]);

        // Reverse to show oldest first in the page
        return {
            messages: messages.reverse(),
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    async editMessage(userId: string, messageId: string, content: string) {
        const message = await this.prisma.teamMessage.findUnique({
            where: { id: messageId },
        });

        if (!message) {
            throw new NotFoundException('Message not found');
        }

        if (message.userId !== userId) {
            throw new ForbiddenException('You can only edit your own messages');
        }

        return this.prisma.teamMessage.update({
            where: { id: messageId },
            data: { content, editedAt: new Date() },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        profile: { select: { avatarUrl: true } },
                    },
                },
            },
        });
    }

    async deleteMessage(userId: string, messageId: string) {
        const message = await this.prisma.teamMessage.findUnique({
            where: { id: messageId },
            include: { team: { include: { members: true } } },
        });

        if (!message) {
            throw new NotFoundException('Message not found');
        }

        // Allow message owner or team leader to delete
        const isOwner = message.userId === userId;
        const isLeader = message.team.members.some(m => m.userId === userId && m.role === 'leader');

        if (!isOwner && !isLeader) {
            throw new ForbiddenException('You cannot delete this message');
        }

        await this.prisma.teamMessage.update({
            where: { id: messageId },
            data: { isDeleted: true },
        });

        return { success: true, teamId: message.teamId };
    }

    async getTeamMembers(teamId: string) {
        return this.prisma.teamMember.findMany({
            where: { teamId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        profile: { select: { avatarUrl: true } },
                    },
                },
            },
        });
    }
}
