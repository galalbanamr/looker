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
import { EventsService, CreateEventDto, UpdateEventDto, EventFilters } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('events')
export class EventsController {
    constructor(private eventsService: EventsService) { }

    // ==========================================
    // PUBLIC ENDPOINTS
    // ==========================================

    @Get()
    async getEvents(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('type') eventType?: string,
        @Query('location') locationType?: string,
        @Query('tags') tags?: string,
        @Query('from') startDateFrom?: string,
        @Query('to') startDateTo?: string,
        @Query('verified') verified?: string,
        @Query('search') search?: string,
    ) {
        const filters: EventFilters = {
            eventType,
            locationType,
            tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
            startDateFrom,
            startDateTo,
            isVerified: verified === 'true' ? true : verified === 'false' ? false : undefined,
            search,
        };

        return this.eventsService.getEvents(
            filters,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
        );
    }

    @Get('featured')
    async getFeaturedEvents(@Query('limit') limit?: string) {
        return this.eventsService.getFeaturedEvents(limit ? parseInt(limit) : 6);
    }

    @Get('upcoming-deadlines')
    async getUpcomingDeadlines(@Query('limit') limit?: string) {
        return this.eventsService.getUpcomingDeadlines(limit ? parseInt(limit) : 10);
    }

    @Get(':id')
    async getEventById(@Param('id') id: string) {
        return this.eventsService.getEventById(id);
    }

    // ==========================================
    // AUTHENTICATED ENDPOINTS
    // ==========================================

    @Post(':id/save')
    @UseGuards(JwtAuthGuard)
    async saveEvent(
        @Param('id') eventId: string,
        @Req() req: Request & { user: { userId: string } },
    ) {
        return this.eventsService.saveEvent(req.user.userId, eventId);
    }

    @Delete(':id/save')
    @UseGuards(JwtAuthGuard)
    async unsaveEvent(
        @Param('id') eventId: string,
        @Req() req: Request & { user: { userId: string } },
    ) {
        return this.eventsService.unsaveEvent(req.user.userId, eventId);
    }

    @Get('user/saved')
    @UseGuards(JwtAuthGuard)
    async getSavedEvents(@Req() req: Request & { user: { userId: string } }) {
        return this.eventsService.getSavedEvents(req.user.userId);
    }
}

// ==========================================
// ADMIN EVENTS CONTROLLER
// ==========================================

@Controller('admin/events')
@UseGuards(JwtAuthGuard)
export class AdminEventsController {
    constructor(private eventsService: EventsService) { }

    @Post()
    async createEvent(
        @Body() dto: CreateEventDto,
        @Req() req: Request & { user: { userId: string } },
    ) {
        return this.eventsService.createEvent(dto, req.user.userId);
    }

    @Put(':id')
    async updateEvent(
        @Param('id') id: string,
        @Body() dto: UpdateEventDto,
    ) {
        return this.eventsService.updateEvent(id, dto);
    }

    @Delete(':id')
    async deleteEvent(@Param('id') id: string) {
        return this.eventsService.deleteEvent(id);
    }

    @Post(':id/verify')
    async verifyEvent(@Param('id') id: string) {
        return this.eventsService.verifyEvent(id);
    }

    @Get('pending')
    async getPendingEvents(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.eventsService.getEvents(
            { isVerified: false },
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
        );
    }
}
