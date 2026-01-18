import { Injectable, Logger } from '@nestjs/common';
import { WhatsappWebService } from '../notifications/whatsapp-web.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

interface OtpEntry {
    code: string;
    expiresAt: Date;
    attempts: number;
}

@Injectable()
export class OtpService {
    private readonly logger = new Logger(OtpService.name);
    private otpStore: Map<string, OtpEntry> = new Map();

    constructor(
        private whatsapp: WhatsappWebService,
        private prisma: PrismaService,
        private jwt: JwtService,
    ) { }

    generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
        // Normalize phone number
        const normalizedPhone = phone.replace(/\s/g, '').startsWith('+')
            ? phone.replace(/\s/g, '')
            : '+' + phone.replace(/\s/g, '');

        // Check rate limiting
        const existing = this.otpStore.get(normalizedPhone);
        if (existing && existing.attempts >= 3) {
            const timeLeft = Math.ceil((existing.expiresAt.getTime() - Date.now()) / 60000);
            if (timeLeft > 0) {
                return { success: false, message: `Too many attempts. Try again in ${timeLeft} minutes.` };
            }
        }

        const code = this.generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        this.otpStore.set(normalizedPhone, {
            code,
            expiresAt,
            attempts: (existing?.attempts || 0) + 1,
        });

        // Send via WhatsApp
        const message = `🔐 *Competition Monitor Verification*

Your OTP is: *${code}*

This code expires in 5 minutes.
Do not share this code with anyone.`;

        const sent = await this.whatsapp.sendMessage(normalizedPhone, message);

        if (sent) {
            this.logger.log(`OTP sent to ${normalizedPhone}`);
            return { success: true, message: 'OTP sent successfully' };
        } else {
            return { success: false, message: 'Failed to send OTP. Is WhatsApp connected?' };
        }
    }

    async verifyOtp(phone: string, code: string): Promise<{ success: boolean; token?: string; message: string }> {
        const normalizedPhone = phone.replace(/\s/g, '').startsWith('+')
            ? phone.replace(/\s/g, '')
            : '+' + phone.replace(/\s/g, '');

        const entry = this.otpStore.get(normalizedPhone);

        if (!entry) {
            return { success: false, message: 'No OTP requested for this number' };
        }

        if (new Date() > entry.expiresAt) {
            this.otpStore.delete(normalizedPhone);
            return { success: false, message: 'OTP has expired' };
        }

        if (entry.code !== code) {
            return { success: false, message: 'Invalid OTP' };
        }

        // OTP is valid - clear it
        this.otpStore.delete(normalizedPhone);

        // Find or create user
        let user = await this.prisma.user.findUnique({
            where: { phone: normalizedPhone },
        });

        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    phone: normalizedPhone,
                    whatsappOptIn: true,
                },
            });
            this.logger.log(`New user created: ${normalizedPhone}`);
        }

        // Generate JWT
        const token = this.jwt.sign({
            sub: user.id,
            phone: user.phone,
        });

        return { success: true, token, message: 'Verification successful' };
    }
}
