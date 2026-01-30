import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateEventDto {
    title: string;
    url: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    registrationDeadline?: string;
    locationType?: 'virtual' | 'in-person' | 'hybrid';
    city?: string;
    country?: string;
    prizes?: Array<{ amount: number; currency: string; position: string }>;
    requirements?: string[];
    tags?: string[];
    eventType?: 'hackathon' | 'conference' | 'workshop' | 'competition';
    organizer?: string;
    imageUrl?: string;
}

export interface UpdateEventDto extends Partial<CreateEventDto> {
    isVerified?: boolean;
}

export interface EventFilters {
    eventType?: string;
    locationType?: string;
    tags?: string[];
    startDateFrom?: string;
    startDateTo?: string;
    isVerified?: boolean;
    search?: string;
}

@Injectable()
export class EventsService {
    constructor(private prisma: PrismaService) { }

    async createEvent(dto: CreateEventDto, userId?: string) {
        // Check for duplicate URL
        const existing = await this.prisma.event.findUnique({
            where: { url: dto.url },
        });
        if (existing) {
            throw new BadRequestException('Event with this URL already exists');
        }

        return this.prisma.event.create({
            data: {
                title: dto.title,
                url: dto.url,
                description: dto.description,
                startDate: dto.startDate ? new Date(dto.startDate) : null,
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                registrationDeadline: dto.registrationDeadline ? new Date(dto.registrationDeadline) : null,
                locationType: dto.locationType || 'virtual',
                city: dto.city,
                country: dto.country,
                prizes: dto.prizes as Prisma.JsonArray | undefined,
                requirements: dto.requirements || [],
                tags: dto.tags || [],
                eventType: dto.eventType || 'hackathon',
                organizer: dto.organizer,
                imageUrl: dto.imageUrl,
                createdById: userId,
            },
        });
    }

    async getEvents(filters: EventFilters, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const where: Prisma.EventWhereInput = {};

        if (filters.eventType) {
            where.eventType = filters.eventType;
        }

        if (filters.locationType) {
            where.locationType = filters.locationType;
        }

        if (filters.isVerified !== undefined) {
            where.isVerified = filters.isVerified;
        }

        if (filters.tags && filters.tags.length > 0) {
            where.tags = { hasSome: filters.tags };
        }

        if (filters.startDateFrom || filters.startDateTo) {
            where.startDate = {};
            if (filters.startDateFrom) {
                where.startDate.gte = new Date(filters.startDateFrom);
            }
            if (filters.startDateTo) {
                where.startDate.lte = new Date(filters.startDateTo);
            }
        }

        if (filters.search) {
            where.OR = [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
                { organizer: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        // Default: Only show events with future deadlines or start dates
        const now = new Date();
        where.OR = [
            { registrationDeadline: { gte: now } },
            { registrationDeadline: null, startDate: { gte: now } },
            { registrationDeadline: null, startDate: null },
        ];

        const [events, total] = await Promise.all([
            this.prisma.event.findMany({
                where,
                skip,
                take: limit,
                orderBy: [
                    { startDate: 'asc' },
                    { discoveredAt: 'desc' },
                ],
                include: {
                    _count: {
                        select: { teams: true, savedBy: true },
                    },
                },
            }),
            this.prisma.event.count({ where }),
        ]);

        return {
            events,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getEventById(id: string) {
        const event = await this.prisma.event.findUnique({
            where: { id },
            include: {
                teams: {
                    where: { isPublic: true },
                    include: {
                        members: {
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
                        },
                    },
                    take: 5,
                },
                _count: {
                    select: { teams: true, savedBy: true },
                },
            },
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        return event;
    }

    async updateEvent(id: string, dto: UpdateEventDto) {
        const event = await this.prisma.event.findUnique({ where: { id } });
        if (!event) {
            throw new NotFoundException('Event not found');
        }

        return this.prisma.event.update({
            where: { id },
            data: {
                ...(dto.title && { title: dto.title }),
                ...(dto.url && { url: dto.url }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.startDate && { startDate: new Date(dto.startDate) }),
                ...(dto.endDate && { endDate: new Date(dto.endDate) }),
                ...(dto.registrationDeadline && { registrationDeadline: new Date(dto.registrationDeadline) }),
                ...(dto.locationType && { locationType: dto.locationType }),
                ...(dto.city !== undefined && { city: dto.city }),
                ...(dto.country !== undefined && { country: dto.country }),
                ...(dto.prizes && { prizes: dto.prizes as Prisma.JsonArray }),
                ...(dto.requirements && { requirements: dto.requirements }),
                ...(dto.tags && { tags: dto.tags }),
                ...(dto.eventType && { eventType: dto.eventType }),
                ...(dto.organizer !== undefined && { organizer: dto.organizer }),
                ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
                ...(dto.isVerified !== undefined && { isVerified: dto.isVerified }),
                lastVerified: new Date(),
            },
        });
    }

    async deleteEvent(id: string) {
        const event = await this.prisma.event.findUnique({ where: { id } });
        if (!event) {
            throw new NotFoundException('Event not found');
        }

        await this.prisma.event.delete({ where: { id } });
        return { success: true };
    }

    async verifyEvent(id: string) {
        return this.prisma.event.update({
            where: { id },
            data: { isVerified: true, lastVerified: new Date() },
        });
    }

    async saveEvent(userId: string, eventId: string) {
        const event = await this.prisma.event.findUnique({ where: { id: eventId } });
        if (!event) {
            throw new NotFoundException('Event not found');
        }

        return this.prisma.savedEvent.upsert({
            where: { userId_eventId: { userId, eventId } },
            create: { userId, eventId },
            update: {},
        });
    }

    async unsaveEvent(userId: string, eventId: string) {
        await this.prisma.savedEvent.deleteMany({
            where: { userId, eventId },
        });
        return { success: true };
    }

    async getSavedEvents(userId: string) {
        const saved = await this.prisma.savedEvent.findMany({
            where: { userId },
            include: { event: true },
            orderBy: { savedAt: 'desc' },
        });
        return saved.map(s => s.event);
    }

    async getFeaturedEvents(limit = 6) {
        const now = new Date();

        return this.prisma.event.findMany({
            where: {
                isVerified: true,
                OR: [
                    { registrationDeadline: { gte: now } },
                    { registrationDeadline: null, startDate: { gte: now } },
                ],
            },
            orderBy: { startDate: 'asc' },
            take: limit,
            include: {
                _count: { select: { teams: true, savedBy: true } },
            },
        });
    }

    async getUpcomingDeadlines(limit = 10) {
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        return this.prisma.event.findMany({
            where: {
                registrationDeadline: {
                    gte: now,
                    lte: weekFromNow,
                },
            },
            orderBy: { registrationDeadline: 'asc' },
            take: limit,
        });
    }
}
