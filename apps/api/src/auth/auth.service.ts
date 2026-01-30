import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as admin from 'firebase-admin';

export interface RegisterDto {
    email: string;
    password: string;
    username: string;
    fullName?: string;
}

export interface LoginDto {
    email: string;
    password: string;
}

@Injectable()
export class AuthService {
    private firebaseApp: admin.app.App | null = null;
    private readonly SALT_ROUNDS = 12;

    constructor(
        private prisma: PrismaService,
        private jwt: JwtService,
        private config: ConfigService,
    ) {
        this.initFirebase();
    }

    private initFirebase() {
        try {
            if (admin.apps.length === 0) {
                const projectId = this.config.get('FIREBASE_PROJECT_ID');
                const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL');
                const privateKey = this.config.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

                if (projectId && clientEmail && privateKey) {
                    this.firebaseApp = admin.initializeApp({
                        credential: admin.credential.cert({
                            projectId,
                            clientEmail,
                            privateKey,
                        }),
                    });
                    console.log('✅ Firebase Admin initialized');
                } else {
                    console.warn('⚠️ Firebase Admin credentials not configured - using development mode');
                }
            } else {
                this.firebaseApp = admin.apps[0];
            }
        } catch (error) {
            console.error('Firebase Admin init error:', error);
        }
    }

    // ==========================================
    // EMAIL/PASSWORD AUTHENTICATION
    // ==========================================

    async register(dto: RegisterDto) {
        // Check if email already exists
        const existingEmail = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingEmail) {
            throw new ConflictException('Email already registered');
        }

        // Check if username already exists
        const existingUsername = await this.prisma.user.findUnique({
            where: { username: dto.username },
        });
        if (existingUsername) {
            throw new ConflictException('Username already taken');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

        // Create user
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash,
                username: dto.username,
                fullName: dto.fullName,
            },
            select: {
                id: true,
                email: true,
                username: true,
                fullName: true,
                createdAt: true,
            },
        });

        // Create empty profile for the user
        await this.prisma.userProfile.create({
            data: {
                userId: user.id,
            },
        });

        // Generate tokens
        const { accessToken, refreshToken } = this.generateTokens(user.id);

        return {
            user,
            accessToken,
            refreshToken,
        };
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            select: {
                id: true,
                email: true,
                username: true,
                fullName: true,
                passwordHash: true,
                createdAt: true,
            },
        });

        if (!user || !user.passwordHash) {
            throw new UnauthorizedException('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // Generate tokens
        const { accessToken, refreshToken } = this.generateTokens(user.id);

        // Remove passwordHash from response
        const { passwordHash, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword,
            accessToken,
            refreshToken,
        };
    }

    async refreshAccessToken(refreshToken: string) {
        try {
            const payload = this.jwt.verify(refreshToken, {
                secret: this.config.get('JWT_REFRESH_SECRET') || this.config.get('JWT_SECRET'),
            });

            if (payload.type !== 'refresh') {
                throw new UnauthorizedException('Invalid refresh token');
            }

            const user = await this.prisma.user.findUnique({
                where: { id: payload.userId },
                select: { id: true, email: true, username: true },
            });

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(user.id);

            return { accessToken, refreshToken: newRefreshToken };
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    private generateTokens(userId: string) {
        const accessToken = this.jwt.sign(
            { userId, type: 'access' },
            { expiresIn: '15m' }
        );

        const refreshToken = this.jwt.sign(
            { userId, type: 'refresh' },
            {
                secret: this.config.get('JWT_REFRESH_SECRET') || this.config.get('JWT_SECRET'),
                expiresIn: '7d',
            }
        );

        return { accessToken, refreshToken };
    }

    // ==========================================
    // FIREBASE/OTP AUTHENTICATION (PRESERVED)
    // ==========================================

    async authenticateWithFirebase(idToken: string) {
        let phone: string;

        if (this.firebaseApp) {
            try {
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                phone = decodedToken.phone_number || '';

                if (!phone) {
                    throw new UnauthorizedException('Phone number not found in token');
                }
            } catch (error: any) {
                console.error('Firebase token verification failed:', error.message);
                throw new UnauthorizedException('Invalid Firebase token');
            }
        } else {
            // Development mode: extract phone from JWT without verification
            try {
                const decoded = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
                phone = decoded.phone_number || '+974' + Date.now().toString().slice(-8);
                console.log('Dev mode: using phone from token:', phone);
            } catch {
                phone = '+974' + Date.now().toString().slice(-8);
                console.log('Dev mode: using generated phone:', phone);
            }
        }

        // Find user by phone or create new one
        let user = await this.prisma.user.findUnique({
            where: { phone },
        });

        if (!user) {
            // Create new user with phone
            const username = `user_${Date.now().toString(36)}`;
            user = await this.prisma.user.create({
                data: {
                    phone,
                    email: `${username}@temp.hackathon.app`, // Temporary email until user sets one
                    username,
                },
            });

            // Create empty profile
            await this.prisma.userProfile.create({
                data: { userId: user.id },
            });
        }

        const { accessToken, refreshToken } = this.generateTokens(user.id);

        return { user, accessToken, refreshToken };
    }

    // ==========================================
    // TOKEN VALIDATION
    // ==========================================

    async validateToken(token: string) {
        try {
            const payload = this.jwt.verify(token);
            return await this.prisma.user.findUnique({
                where: { id: payload.userId },
            });
        } catch {
            throw new UnauthorizedException('Invalid token');
        }
    }

    async getCurrentUser(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                fullName: true,
                phone: true,
                timezone: true,
                whatsappOptIn: true,
                isEmailVerified: true,
                createdAt: true,
                profile: true,
            },
        });
    }

    async getUserById(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                fullName: true,
                createdAt: true,
            },
        });
    }
}
