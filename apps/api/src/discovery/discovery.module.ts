import { Module } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { DedupeService } from './dedupe.service';
import { PerplexityModule } from '../perplexity/perplexity.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
    imports: [PerplexityModule, NotificationModule],
    providers: [DiscoveryService, DedupeService],
    exports: [DiscoveryService, DedupeService],
})
export class DiscoveryModule { }
