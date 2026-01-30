import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { DiscoveryService } from '../discovery/discovery.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
    constructor(
        private profiles: ProfilesService,
        private discovery: DiscoveryService,
    ) { }

    @Get('list')
    async findAll(@Req() req: Request & { user: { userId: string } }) {
        return this.profiles.findAll(req.user.userId);
    }

    @Get('stats')
    async getStats(@Req() req: Request & { user: { userId: string } }) {
        return this.profiles.getStats(req.user.userId);
    }

    @Get('get/:id')
    async findOne(@Param('id') id: string, @Req() req: Request & { user: { userId: string } }) {
        return this.profiles.findOne(id, req.user.userId);
    }

    @Post('create')
    async create(
        @Body() body: {
            name: string;
            description?: string;
            keywords: string[];
            location?: string;
            frequencyPerDay?: number;
            quietHoursStart?: number;
            quietHoursEnd?: number;
            maxResultsPerRun?: number;
            notificationMode?: 'immediate' | 'digest';
            digestTime?: string;
            whatsappNumber: string;
        },
        @Req() req: Request & { user: { userId: string } }
    ) {
        const profile = await this.profiles.create(req.user.userId, body);

        // Trigger immediate discovery
        this.discovery.runDiscovery(profile.id).catch(err =>
            console.error(`Failed to run immediate discovery for ${profile.id}:`, err)
        );

        return profile;
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() body: any,
        @Req() req: Request & { user: { userId: string } }
    ) {
        return this.profiles.update(id, req.user.userId, body);
    }

    @Delete('delete/:id')
    async delete(@Param('id') id: string, @Req() req: Request & { user: { userId: string } }) {
        return this.profiles.delete(id, req.user.userId);
    }

    @Post(':id/toggle')
    async toggle(@Param('id') id: string, @Req() req: Request & { user: { userId: string } }) {
        const profile = await this.profiles.toggle(id, req.user.userId);

        if (profile.isActive) {
            // Trigger immediate discovery if activated
            this.discovery.runDiscovery(profile.id).catch(err =>
                console.error(`Failed to run immediate discovery for ${profile.id}:`, err)
            );
        }

        return profile;
    }

    @Post(':id/run')
    async runNow(@Param('id') id: string, @Req() req: Request & { user: { userId: string } }) {
        // Verify ownership
        await this.profiles.findOne(id, req.user.userId);

        // Run discovery
        const result = await this.discovery.runDiscovery(id);

        return {
            success: true,
            ...result,
        };
    }
}
