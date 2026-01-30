import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { NotificationModule } from './notifications/notification.module';
import { PerplexityModule } from './perplexity/perplexity.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { EventsModule } from './events/events.module';
import { UsersModule } from './users/users.module';
import { TeamsModule } from './teams/teams.module';
import { AdminModule } from './admin/admin.module';
import { ChatModule } from './chat/chat.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ScheduleModule.forRoot(),
        PrismaModule,
        AuthModule,
        ProfilesModule,
        DiscoveryModule,
        NotificationModule,
        PerplexityModule,
        SchedulerModule,
        EventsModule,
        UsersModule,
        TeamsModule,
        AdminModule,
        ChatModule,
    ],
})
export class AppModule { }
