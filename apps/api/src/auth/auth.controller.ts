import { Controller, Post, Get, Body, Res, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService, RegisterDto, LoginDto } from './auth.service';
import { OtpService } from './otp.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private otpService: OtpService,
    ) { }

    // ==========================================
    // EMAIL/PASSWORD AUTHENTICATION
    // ==========================================

    @Post('register')
    async register(
        @Body() body: RegisterDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.register(body);

        this.setTokenCookies(res, result.accessToken, result.refreshToken);

        return {
            success: true,
            user: result.user,
        };
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() body: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.login(body);

        this.setTokenCookies(res, result.accessToken, result.refreshToken);

        return {
            success: true,
            user: result.user,
        };
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshToken(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            return { success: false, message: 'No refresh token provided' };
        }

        const tokens = await this.authService.refreshAccessToken(refreshToken);

        this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

        return { success: true };
    }

    // ==========================================
    // OTP AUTHENTICATION (PRESERVED)
    // ==========================================

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
            const isProduction = process.env.NODE_ENV === 'production';
            res.cookie('token', result.token, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'none' : 'lax',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
        }

        return result;
    }

    // ==========================================
    // FIREBASE AUTHENTICATION (PRESERVED)
    // ==========================================

    @Post('firebase')
    async authenticateWithFirebase(
        @Body() body: { idToken: string },
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.authenticateWithFirebase(body.idToken);

        this.setTokenCookies(res, result.accessToken, result.refreshToken);

        return { success: true, user: result.user };
    }

    // ==========================================
    // SESSION MANAGEMENT
    // ==========================================

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
        this.clearTokenCookies(res);
        return { success: true };
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
        const isProduction = process.env.NODE_ENV === 'production';

        // Access token cookie (15 minutes)
        res.cookie('token', accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: '/',
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        // Refresh token cookie (7 days)
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
    }

    private clearTokenCookies(res: Response) {
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
            path: '/',
            expires: new Date(0),
        };

        res.cookie('token', '', cookieOptions);
        res.cookie('refreshToken', '', cookieOptions);
    }
}
