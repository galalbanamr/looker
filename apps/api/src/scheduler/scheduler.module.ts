import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { DiscoveryModule } from '../discovery/discovery.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
    imports: [DiscoveryModule, NotificationModule],
    providers: [SchedulerService],
})
export class SchedulerModule { }
