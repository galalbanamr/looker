import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import { Request } from 'express';
import { TeamsService, CreateTeamDto, UpdateTeamDto, InviteUserDto } from './teams.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('teams')
export class TeamsController {
    constructor(private teamsService: TeamsService) { }

    // ==========================================
    // PUBLIC ENDPOINTS
    // ==========================================

    @Get('event/:eventId')
    async getTeamsForEvent(
        @Param('eventId') eventId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.teamsService.getTeamsForEvent(
            eventId,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
        );
    }

    @Get(':id')
    async getTeamById(@Param('id') id: string) {
        return this.teamsService.getTeamById(id);
    }

    // ==========================================
    // AUTHENTICATED - TEAM CRUD
    // ==========================================

    @Post()
    @UseGuards(JwtAuthGuard)
    async createTeam(
        @Req() req: Request & { user: { userId: string } },
        @Body() dto: CreateTeamDto,
    ) {
        return this.teamsService.createTeam(req.user.userId, dto);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    async updateTeam(
        @Req() req: Request & { user: { userId: string } },
        @Param('id') id: string,
        @Body() dto: UpdateTeamDto,
    ) {
        return this.teamsService.updateTeam(req.user.userId, id, dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async deleteTeam(
        @Req() req: Request & { user: { userId: string } },
        @Param('id') id: string,
    ) {
        return this.teamsService.deleteTeam(req.user.userId, id);
    }

    // ==========================================
    // AUTHENTICATED - MY TEAMS
    // ==========================================

    @Get('user/my-teams')
    @UseGuards(JwtAuthGuard)
    async getMyTeams(@Req() req: Request & { user: { userId: string } }) {
        return this.teamsService.getMyTeams(req.user.userId);
    }

    // ==========================================
    // AUTHENTICATED - INVITATIONS
    // ==========================================

    @Post(':id/invite')
    @UseGuards(JwtAuthGuard)
    async inviteUser(
        @Req() req: Request & { user: { userId: string } },
        @Param('id') teamId: string,
        @Body() dto: InviteUserDto,
    ) {
        return this.teamsService.inviteUser(req.user.userId, teamId, dto);
    }

    @Get('user/invitations')
    @UseGuards(JwtAuthGuard)
    async getMyInvitations(@Req() req: Request & { user: { userId: string } }) {
        return this.teamsService.getMyInvitations(req.user.userId);
    }

    @Post('invitations/:id/accept')
    @UseGuards(JwtAuthGuard)
    async acceptInvitation(
        @Req() req: Request & { user: { userId: string } },
        @Param('id') invitationId: string,
    ) {
        return this.teamsService.acceptInvitation(req.user.userId, invitationId);
    }

    @Post('invitations/:id/reject')
    @UseGuards(JwtAuthGuard)
    async rejectInvitation(
        @Req() req: Request & { user: { userId: string } },
        @Param('id') invitationId: string,
    ) {
        return this.teamsService.rejectInvitation(req.user.userId, invitationId);
    }

    // ==========================================
    // AUTHENTICATED - MEMBER MANAGEMENT
    // ==========================================

    @Delete(':id/members/:userId')
    @UseGuards(JwtAuthGuard)
    async removeMember(
        @Req() req: Request & { user: { userId: string } },
        @Param('id') teamId: string,
        @Param('userId') memberUserId: string,
    ) {
        return this.teamsService.removeMember(req.user.userId, teamId, memberUserId);
    }

    @Post(':id/leave')
    @UseGuards(JwtAuthGuard)
    async leaveTeam(
        @Req() req: Request & { user: { userId: string } },
        @Param('id') teamId: string,
    ) {
        return this.teamsService.leaveTeam(req.user.userId, teamId);
    }
}
