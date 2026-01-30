import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService, SendMessageDto } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    teamId?: string;
}

@WebSocketGateway({
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    },
    namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private connectedUsers: Map<string, Set<string>> = new Map(); // teamId -> Set<userId>
    private userSockets: Map<string, AuthenticatedSocket> = new Map(); // `${teamId}:${userId}` -> socket

    constructor(
        private jwtService: JwtService,
        private chatService: ChatService,
        private prisma: PrismaService,
    ) { }

    async handleConnection(client: AuthenticatedSocket) {
        try {
            // Extract token from handshake
            const token = client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.replace('Bearer ', '');

            if (!token) {
                console.log('WebSocket connection rejected: No token');
                client.disconnect();
                return;
            }

            // Verify JWT
            const payload = this.jwtService.verify(token);
            client.userId = payload.userId;

            console.log(`User ${client.userId} connected to chat`);
        } catch (error) {
            console.log('WebSocket connection rejected: Invalid token');
            client.disconnect();
        }
    }

    handleDisconnect(client: AuthenticatedSocket) {
        if (client.userId && client.teamId) {
            // Remove from team room
            const teamUsers = this.connectedUsers.get(client.teamId);
            if (teamUsers) {
                teamUsers.delete(client.userId);
                if (teamUsers.size === 0) {
                    this.connectedUsers.delete(client.teamId);
                }
            }

            // Remove socket reference
            this.userSockets.delete(`${client.teamId}:${client.userId}`);

            // Notify team members
            this.server.to(client.teamId).emit('user_left', {
                userId: client.userId,
                timestamp: new Date().toISOString(),
            });
        }
        console.log(`User ${client.userId || 'unknown'} disconnected from chat`);
    }

    @SubscribeMessage('join_team')
    async handleJoinTeam(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { teamId: string },
    ) {
        if (!client.userId) {
            return { error: 'Not authenticated' };
        }

        try {
            // Verify team membership
            await this.chatService.verifyTeamMember(client.userId, data.teamId);

            // Leave previous team room if any
            if (client.teamId) {
                client.leave(client.teamId);
            }

            // Join new team room
            client.join(data.teamId);
            client.teamId = data.teamId;

            // Track connected users
            if (!this.connectedUsers.has(data.teamId)) {
                this.connectedUsers.set(data.teamId, new Set());
            }
            this.connectedUsers.get(data.teamId)!.add(client.userId);
            this.userSockets.set(`${data.teamId}:${client.userId}`, client);

            // Get team members
            const members = await this.chatService.getTeamMembers(data.teamId);
            const onlineUsers = Array.from(this.connectedUsers.get(data.teamId) || []);

            // Notify team members
            this.server.to(data.teamId).emit('user_joined', {
                userId: client.userId,
                timestamp: new Date().toISOString(),
            });

            return {
                success: true,
                members,
                onlineUsers,
            };
        } catch (error: any) {
            return { error: error.message || 'Failed to join team' };
        }
    }

    @SubscribeMessage('send_message')
    async handleSendMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: SendMessageDto,
    ) {
        if (!client.userId || !client.teamId) {
            return { error: 'Not in a team chat' };
        }

        try {
            const message = await this.chatService.sendMessage(
                client.userId,
                client.teamId,
                data,
            );

            // Broadcast to all team members
            this.server.to(client.teamId).emit('new_message', message);

            return { success: true, message };
        } catch (error: any) {
            return { error: error.message || 'Failed to send message' };
        }
    }

    @SubscribeMessage('typing')
    handleTyping(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { isTyping: boolean },
    ) {
        if (!client.userId || !client.teamId) {
            return;
        }

        // Broadcast typing status to other team members
        client.to(client.teamId).emit('user_typing', {
            userId: client.userId,
            isTyping: data.isTyping,
        });
    }

    @SubscribeMessage('edit_message')
    async handleEditMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { messageId: string; content: string },
    ) {
        if (!client.userId || !client.teamId) {
            return { error: 'Not in a team chat' };
        }

        try {
            const message = await this.chatService.editMessage(
                client.userId,
                data.messageId,
                data.content,
            );

            // Broadcast edit to all team members
            this.server.to(client.teamId).emit('message_edited', message);

            return { success: true, message };
        } catch (error: any) {
            return { error: error.message || 'Failed to edit message' };
        }
    }

    @SubscribeMessage('delete_message')
    async handleDeleteMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { messageId: string },
    ) {
        if (!client.userId || !client.teamId) {
            return { error: 'Not in a team chat' };
        }

        try {
            const result = await this.chatService.deleteMessage(client.userId, data.messageId);

            // Broadcast deletion to all team members
            this.server.to(client.teamId).emit('message_deleted', {
                messageId: data.messageId,
            });

            return { success: true };
        } catch (error: any) {
            return { error: error.message || 'Failed to delete message' };
        }
    }
}
