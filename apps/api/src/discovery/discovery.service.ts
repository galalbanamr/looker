import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PerplexityService, StructuredItem } from '../perplexity/perplexity.service';
import { DedupeService } from './dedupe.service';
import { WhatsappWebService } from '../notifications/whatsapp-web.service';

@Injectable()
export class DiscoveryService {
    private readonly logger = new Logger(DiscoveryService.name);

    constructor(
        private prisma: PrismaService,
        private perplexity: PerplexityService,
        private dedupe: DedupeService,
        private whatsapp: WhatsappWebService,
    ) { }

    /**
     * Run discovery for a specific search profile
     */
    async runDiscovery(profileId: string): Promise<{
        newItems: number;
        totalResults: number;
        notified: boolean;
    }> {
        const profile = await this.prisma.searchProfile.findUnique({
            where: { id: profileId },
            include: { user: true },
        });

        if (!profile || !profile.isActive) {
            this.logger.warn(`Profile ${profileId} not found or inactive`);
            return { newItems: 0, totalResults: 0, notified: false };
        }

        this.logger.log(`🔍 Starting discovery for profile: ${profile.name}`);

        let totalResults = 0;
        let newItems = 0;
        const newDiscoveredItems: Array<{
            title: string;
            whatItIs: string;
            deadline: string | null;
            link: string;
        }> = [];

        // Search for each keyword
        for (const keyword of profile.keywords) {
            // Create search run record
            const searchRun = await this.prisma.searchRun.create({
                data: {
                    profileId,
                    query: keyword,
                    status: 'running',
                },
            });

            try {
                // Search using Perplexity
                const results = await this.perplexity.searchCompetitions(keyword, profile.location);
                totalResults += results.length;

                // Process each result
                for (const result of results.slice(0, profile.maxResultsPerRun)) {
                    const urlHash = this.dedupe.getUrlHash(result.url);
                    const titleHash = this.dedupe.getTitleHash(result.title);
                    const sourceDomain = this.dedupe.extractDomain(result.url);

                    // Check if already exists
                    const existing = await this.prisma.discoveredItem.findFirst({
                        where: { profileId, urlHash },
                    });

                    if (existing) {
                        this.logger.debug(`Skipping duplicate: ${result.title}`);
                        continue;
                    }

                    // Extract detailed information
                    const details = await this.perplexity.extractDetails(result.url, result.title);

                    if (details) {
                        // Save to database
                        const item = await this.prisma.discoveredItem.create({
                            data: {
                                profileId,
                                urlHash,
                                titleHash,
                                url: result.url,
                                title: details.title || result.title,
                                whatItIs: details.what_it_is,
                                deadline: details.deadline,
                                deadlineConfidence: details.deadline_confidence,
                                location: details.location,
                                eligibility: details.eligibility,
                                sourceDomain,
                                notes: details.notes,
                                rawJson: details as any,
                            },
                        });

                        newItems++;
                        newDiscoveredItems.push({
                            title: item.title,
                            whatItIs: item.whatItIs,
                            deadline: item.deadline,
                            link: item.url,
                        });

                        this.logger.log(`✅ New item discovered: ${item.title}`);
                    }
                }

                // Update search run
                await this.prisma.searchRun.update({
                    where: { id: searchRun.id },
                    data: {
                        status: 'completed',
                        finishedAt: new Date(),
                        newItemCount: newItems,
                        totalResults,
                    },
                });

            } catch (error: any) {
                this.logger.error(`Discovery error for keyword "${keyword}": ${error.message}`);
                await this.prisma.searchRun.update({
                    where: { id: searchRun.id },
                    data: {
                        status: 'failed',
                        finishedAt: new Date(),
                        error: error.message,
                    },
                });
            }
        }

        // Send notifications
        let notified = false;
        if (newDiscoveredItems.length > 0) {
            if (profile.notificationMode === 'immediate') {
                notified = await this.sendImmediateNotifications(profile, newDiscoveredItems);
            }
            // For digest mode, items are collected and sent later by the scheduler
        }

        return { newItems, totalResults, notified };
    }

    /**
     * Send immediate notifications for new items
     */
    private async sendImmediateNotifications(
        profile: { whatsappNumber: string; id: string },
        items: Array<{ title: string; whatItIs: string; deadline: string | null; link: string }>
    ): Promise<boolean> {
        try {
            if (items.length === 1) {
                // Single item - send individual alert
                const sent = await this.whatsapp.sendCompetitionAlert(
                    profile.whatsappNumber,
                    items[0]
                );
                if (sent) {
                    await this.markItemsAsNotified(profile.id, items);
                }
                return sent;
            } else {
                // Multiple items - send digest
                const sent = await this.whatsapp.sendDigest(profile.whatsappNumber, items);
                if (sent) {
                    await this.markItemsAsNotified(profile.id, items);
                }
                return sent;
            }
        } catch (error: any) {
            this.logger.error(`Notification error: ${error.message}`);
            return false;
        }
    }

    /**
     * Mark items as notified in database
     */
    private async markItemsAsNotified(
        profileId: string,
        items: Array<{ link: string }>
    ): Promise<void> {
        for (const item of items) {
            const urlHash = this.dedupe.getUrlHash(item.link);
            await this.prisma.discoveredItem.updateMany({
                where: { profileId, urlHash },
                data: { notified: true, notifiedAt: new Date() },
            });
        }
    }

    /**
     * Get pending items for daily digest
     */
    async getPendingDigestItems(profileId: string) {
        return this.prisma.discoveredItem.findMany({
            where: {
                profileId,
                notified: false,
            },
            orderBy: { discoveredAt: 'desc' },
        });
    }
}
