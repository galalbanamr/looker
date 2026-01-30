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
import {
    UsersService,
    UpdateProfileDto,
    AddSkillDto,
    AddHackathonHistoryDto,
    UserSearchFilters,
} from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) { }

    // ==========================================
    // PUBLIC ENDPOINTS
    // ==========================================

    @Get('search')
    async searchUsers(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('skills') skills?: string,
        @Query('interests') interests?: string,
        @Query('location') location?: string,
        @Query('q') search?: string,
    ) {
        const filters: UserSearchFilters = {
            skills: skills ? skills.split(',').map(s => s.trim()) : undefined,
            interests: interests ? interests.split(',').map(i => i.trim()) : undefined,
            location,
            search,
        };

        return this.usersService.searchUsers(
            filters,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
        );
    }

    @Get('skills/popular')
    async getPopularSkills(@Query('limit') limit?: string) {
        return this.usersService.getPopularSkills(limit ? parseInt(limit) : 20);
    }

    @Get('interests/popular')
    async getPopularInterests(@Query('limit') limit?: string) {
        return this.usersService.getPopularInterests(limit ? parseInt(limit) : 20);
    }

    @Get(':username')
    async getPublicProfile(
        @Param('username') username: string,
        @Req() req: Request & { user?: { userId: string } },
    ) {
        return this.usersService.getPublicProfile(username, req.user?.userId);
    }

    // ==========================================
    // AUTHENTICATED - MY PROFILE
    // ==========================================

    @Get('me/profile')
    @UseGuards(JwtAuthGuard)
    async getMyProfile(@Req() req: Request & { user: { userId: string } }) {
        return this.usersService.getMyProfile(req.user.userId);
    }

    @Put('me/profile')
    @UseGuards(JwtAuthGuard)
    async updateMyProfile(
        @Req() req: Request & { user: { userId: string } },
        @Body() dto: UpdateProfileDto,
    ) {
        return this.usersService.updateProfile(req.user.userId, dto);
    }

    // ==========================================
    // AUTHENTICATED - SKILLS
    // ==========================================

    @Get('me/skills')
    @UseGuards(JwtAuthGuard)
    async getMySkills(@Req() req: Request & { user: { userId: string } }) {
        return this.usersService.getSkills(req.user.userId);
    }

    @Post('me/skills')
    @UseGuards(JwtAuthGuard)
    async addSkill(
        @Req() req: Request & { user: { userId: string } },
        @Body() dto: AddSkillDto,
    ) {
        return this.usersService.addSkill(req.user.userId, dto);
    }

    @Delete('me/skills/:skill')
    @UseGuards(JwtAuthGuard)
    async removeSkill(
        @Req() req: Request & { user: { userId: string } },
        @Param('skill') skill: string,
    ) {
        return this.usersService.removeSkill(req.user.userId, skill);
    }

    // ==========================================
    // AUTHENTICATED - INTERESTS
    // ==========================================

    @Get('me/interests')
    @UseGuards(JwtAuthGuard)
    async getMyInterests(@Req() req: Request & { user: { userId: string } }) {
        return this.usersService.getInterests(req.user.userId);
    }

    @Post('me/interests')
    @UseGuards(JwtAuthGuard)
    async addInterest(
        @Req() req: Request & { user: { userId: string } },
        @Body() body: { interest: string },
    ) {
        return this.usersService.addInterest(req.user.userId, body.interest);
    }

    @Delete('me/interests/:interest')
    @UseGuards(JwtAuthGuard)
    async removeInterest(
        @Req() req: Request & { user: { userId: string } },
        @Param('interest') interest: string,
    ) {
        return this.usersService.removeInterest(req.user.userId, interest);
    }

    // ==========================================
    // AUTHENTICATED - HACKATHON HISTORY
    // ==========================================

    @Post('me/history')
    @UseGuards(JwtAuthGuard)
    async addHackathonHistory(
        @Req() req: Request & { user: { userId: string } },
        @Body() dto: AddHackathonHistoryDto,
    ) {
        return this.usersService.addHackathonHistory(req.user.userId, dto);
    }

    @Put('me/history/:id')
    @UseGuards(JwtAuthGuard)
    async updateHackathonHistory(
        @Req() req: Request & { user: { userId: string } },
        @Param('id') id: string,
        @Body() dto: AddHackathonHistoryDto,
    ) {
        return this.usersService.updateHackathonHistory(req.user.userId, id, dto);
    }

    @Delete('me/history/:id')
    @UseGuards(JwtAuthGuard)
    async deleteHackathonHistory(
        @Req() req: Request & { user: { userId: string } },
        @Param('id') id: string,
    ) {
        return this.usersService.deleteHackathonHistory(req.user.userId, id);
    }
}
