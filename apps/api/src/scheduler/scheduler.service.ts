import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DiscoveryService } from '../discovery/discovery.service';
import { WhatsappWebService } from '../notifications/whatsapp-web.service';

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger(SchedulerService.name);

    constructor(
        private prisma: PrismaService,
        private discovery: DiscoveryService,
        private whatsapp: WhatsappWebService,
    ) { }

    /**
     * Run discovery for all active profiles every 4 hours (3x per day base)
     * Individual profiles can have higher frequencies
     */
    @Cron(CronExpression.EVERY_4_HOURS)
    async runScheduledDiscovery() {
        this.logger.log('⏰ Running scheduled discovery...');

        const profiles = await this.prisma.searchProfile.findMany({
            where: { isActive: true },
            include: { user: true },
        });

        for (const profile of profiles) {
            // Check if it's within quiet hours
            if (this.isQuietHours(profile)) {
                this.logger.debug(`Skipping ${profile.name} - quiet hours`);
                continue;
            }

            // Check if we should run based on frequency
            if (!(await this.shouldRunNow(profile))) {
                continue;
            }

            try {
                const result = await this.discovery.runDiscovery(profile.id);
                this.logger.log(
                    `✅ ${profile.name}: ${result.newItems} new items found`
                );
            } catch (error: any) {
                this.logger.error(`❌ Error running discovery for ${profile.name}: ${error.message}`);
            }
        }
    }

    /**
     * Process daily digests at configured times
     */
    @Cron(CronExpression.EVERY_HOUR)
    async processDigests() {
        const currentHour = new Date().getHours();
        const currentMinute = new Date().getMinutes();
        const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute < 30 ? '00' : '30'}`;

        const digestProfiles = await this.prisma.searchProfile.findMany({
            where: {
                isActive: true,
                notificationMode: 'digest',
                digestTime: { startsWith: currentHour.toString().padStart(2, '0') },
            },
        });

        for (const profile of digestProfiles) {
            try {
                const pendingItems = await this.discovery.getPendingDigestItems(profile.id);

                if (pendingItems.length > 0) {
                    const items = pendingItems.map(item => ({
                        title: item.title,
                        whatItIs: item.whatItIs,
                        deadline: item.deadline,
                        link: item.url,
                    }));

                    const sent = await this.whatsapp.sendDigest(profile.whatsappNumber, items);

                    if (sent) {
                        // Mark as notified
                        await this.prisma.discoveredItem.updateMany({
                            where: { id: { in: pendingItems.map(i => i.id) } },
                            data: { notified: true, notifiedAt: new Date() },
                        });

                        this.logger.log(`📨 Digest sent for ${profile.name}: ${items.length} items`);
                    }
                }
            } catch (error: any) {
                this.logger.error(`Digest error for ${profile.name}: ${error.message}`);
            }
        }
    }

    private isQuietHours(profile: { quietHoursStart: number | null; quietHoursEnd: number | null }): boolean {
        if (profile.quietHoursStart === null || profile.quietHoursEnd === null) {
            return false;
        }

        const currentHour = new Date().getHours();

        if (profile.quietHoursStart < profile.quietHoursEnd) {
            return currentHour >= profile.quietHoursStart && currentHour < profile.quietHoursEnd;
        } else {
            // Quiet hours span midnight
            return currentHour >= profile.quietHoursStart || currentHour < profile.quietHoursEnd;
        }
    }

    private async shouldRunNow(profile: { frequencyPerDay: number; id: string }): Promise<boolean> {
        // Get the last completed search run for this profile
        const lastRun = await this.prisma.searchRun.findFirst({
            where: {
                profileId: profile.id,
                status: 'completed'
            },
            orderBy: { startedAt: 'desc' },
        });

        if (!lastRun) {
            // Never run before, should run now
            return true;
        }

        // Calculate hours since last run
        const hoursSinceLastRun = (Date.now() - lastRun.startedAt.getTime()) / (1000 * 60 * 60);

        // Calculate required interval based on frequency
        // frequencyPerDay = 1 means run once every 24 hours
        // frequencyPerDay = 3 means run once every 8 hours
        const hoursPerRun = 24 / profile.frequencyPerDay;

        return hoursSinceLastRun >= hoursPerRun;
    }
}
