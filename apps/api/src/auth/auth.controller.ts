import { Controller, Post, Get, Body, Res, UseGuards, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private otpService: OtpService,
    ) { }

    @Post('send-otp')
    async sendOtp(@Body() body: { phone: string }) {
        console.log('[Auth] send-otp request for:', body.phone);
        const result = await this.otpService.sendOtp(body.phone);
        return result;
    }

    @Post('verify-otp')
    async verifyOtp(
        @Body() body: { phone: string; code: string },
        @Res({ passthrough: true }) res: Response,
    ) {
        console.log('[Auth] verify-otp request for:', body.phone);
        const result = await this.otpService.verifyOtp(body.phone, body.code);

        if (result.success && result.token) {
            res.cookie('token', result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
        }

        return result;
    }

    @Post('firebase')
    async authenticateWithFirebase(
        @Body() body: { idToken: string },
        @Res({ passthrough: true }) res: Response,
    ) {
        const { user, token } = await this.authService.authenticateWithFirebase(body.idToken);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return { success: true, user };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getCurrentUser(@Req() req: Request & { user: { sub?: string; userId?: string } }) {
        const userId = req.user.sub || req.user.userId;

        if (!userId) {
            return { success: false, message: 'Invalid token payload' };
        }

        const user = await this.authService.getCurrentUser(userId);

        if (!user) {
            return { success: false, message: 'User not found' };
        }

        return { success: true, user };
    }

    @Post('logout')
    async logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });
        res.cookie('token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: new Date(0),
            path: '/'
        });
        return { success: true };
    }
}
