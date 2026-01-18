import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { DiscoveryModule } from '../discovery/discovery.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [DiscoveryModule, AuthModule],
    controllers: [ProfilesController],
    providers: [ProfilesService],
    exports: [ProfilesService],
})
export class ProfilesModule { }
