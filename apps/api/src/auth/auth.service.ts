import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
    private firebaseApp: admin.app.App | null = null;

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

        const user = await this.prisma.user.upsert({
            where: { phone },
            update: {},
            create: { phone },
        });

        const token = this.jwt.sign({ userId: user.id, phone: user.phone });

        return { user, token };
    }

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
                phone: true,
                name: true,
                email: true,
                timezone: true,
                whatsappOptIn: true,
                createdAt: true,
            },
        });
    }
}
