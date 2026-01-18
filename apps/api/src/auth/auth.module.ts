import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { NotificationModule } from '../notifications/notification.module';

@Module({
    imports: [
        forwardRef(() => NotificationModule),
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get('JWT_SECRET') || 'placeholder-jwt-secret-change-me',
                signOptions: { expiresIn: '7d' },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, OtpService],
    exports: [AuthService, OtpService, JwtModule],
})
export class AuthModule { }
