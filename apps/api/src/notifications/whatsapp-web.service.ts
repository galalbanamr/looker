import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WhatsappWebService implements OnModuleInit {
    private readonly logger = new Logger(WhatsappWebService.name);
    private socket: ReturnType<typeof makeWASocket> | null = null;
    private isReady = false;
    private pairingCode: string | null = null;
    private qrCode: string | null = null;
    private phoneNumber: string | null = null;
    private lastError: string | null = null;
    private authFolder = './whatsapp-auth';

    async onModuleInit() {
        // Ensure auth folder exists
        if (!fs.existsSync(this.authFolder)) {
            fs.mkdirSync(this.authFolder, { recursive: true });
        }

        const credsPath = path.join(this.authFolder, 'creds.json');
        if (fs.existsSync(credsPath)) {
            this.logger.log('🔄 Found existing WhatsApp session, attempting to resume...');
            try {
                await this.connect();
            } catch (err) {
                this.logger.error('❌ Failed to resume session on startup:', err);
                this.lastError = 'Startup connection failed';
            }
        } else {
            this.logger.log('ℹ️ No WhatsApp session found. Use /whatsapp/pair to connect.');
        }
    }

    async requestPairingCode(phone: string): Promise<{ success: boolean; code?: string; message: string }> {
        this.lastError = null;

        if (this.isReady) {
            return { success: true, message: 'Already connected' };
        }

        // Clean existing socket
        if (this.socket) {
            try {
                this.socket.end(undefined);
            } catch (e) {
                this.logger.warn('Error closing existing socket:', e);
            }
            this.socket = null;
        }

        // Clean existing session (clear contents, not directory itself - it may be a Docker volume)
        if (fs.existsSync(this.authFolder)) {
            const files = fs.readdirSync(this.authFolder);
            for (const file of files) {
                const filePath = path.join(this.authFolder, file);
                fs.rmSync(filePath, { recursive: true, force: true });
            }
            this.logger.log('Cleared old session data');
        }

        this.phoneNumber = phone.replace(/\D/g, '');
        this.logger.log(`📱 Requesting pairing code for: ${this.phoneNumber}`);

        try {
            const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
            const { version } = await fetchLatestBaileysVersion();
            this.logger.log(`Using Baileys version: ${version.join('.')}`);

            this.socket = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, this.logger as any),
                },
                printQRInTerminal: true, // Enable terminal QR for debugging
                browser: ['Looker', 'Chrome', '120.0.0'],
                syncFullHistory: false,
            });

            this.socket.ev.on('creds.update', saveCreds);

            // Enhanced connection logging
            this.socket.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                this.logger.log(`🔄 Connection update: ${JSON.stringify({ connection, hasQR: !!qr, hasError: !!lastDisconnect?.error })}`);

                if (qr) {
                    this.qrCode = qr;
                    this.logger.log('📷 QR code received (available as fallback)');
                }

                if (connection === 'close') {
                    const error = lastDisconnect?.error as Boom;
                    const statusCode = error?.output?.statusCode;
                    const errorMessage = error?.message || 'Unknown error';
                    const errorData = error?.output?.payload;

                    this.lastError = `Status ${statusCode}: ${errorMessage}`;
                    this.logger.error(`❌ Connection closed:`, {
                        statusCode,
                        errorMessage,
                        errorData,
                        stack: error?.stack,
                    });

                    this.isReady = false;


                    // Determine if we should reconnect
                    // logic: if it's NOT a "Logged Out" error, we should try to reconnect
                    const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

                    if (shouldReconnect) {
                        this.logger.log(`⚠️ Connection closed (Status ${statusCode}), attempting to reconnect...`);
                        // slight delay to prevent rapid-fire loops
                        setTimeout(() => this.connect(), 2000);
                    } else {
                        this.logger.error('❌ Connection closed: Logged out. You must re-pair via /whatsapp/pair');
                        this.lastError = 'Logged out - Reconnection required';
                        // Only clear auth folder if explicitly logged out
                        if (fs.existsSync(this.authFolder)) {
                            this.logger.log('Clearing session data due to logout');
                            try {
                                fs.rmSync(this.authFolder, { recursive: true });
                            } catch (err) {
                                this.logger.error('Failed to clear auth folder', err);
                            }
                        }
                    }



                } else if (connection === 'open') {
                    this.isReady = true;
                    this.pairingCode = null;
                    this.qrCode = null;
                    this.lastError = null;
                    this.logger.log('✅ WhatsApp connected successfully!');
                }
            });

            // Wait for socket to initialize
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Request pairing code
            if (this.socket && !this.socket.authState.creds.registered) {
                try {
                    this.logger.log('Requesting pairing code from WhatsApp...');
                    this.pairingCode = await this.socket.requestPairingCode(this.phoneNumber);
                    this.logger.log(`✅ Pairing code generated: ${this.pairingCode}`);

                    return {
                        success: true,
                        code: this.pairingCode,
                        message: `Enter code ${this.pairingCode} in WhatsApp`
                    };
                } catch (error: any) {
                    this.lastError = error.message || 'Pairing code request failed';
                    this.logger.error('❌ Pairing code request failed:', {
                        message: error.message,
                        stack: error.stack,
                    });
                    return {
                        success: false,
                        message: this.lastError || 'Pairing code request failed'
                    };
                }
            } else {
                return { success: true, message: 'Already registered or connecting...' };
            }
        } catch (error: any) {
            this.lastError = error.message || 'Failed to connect';
            this.logger.error('❌ Connection error:', {
                message: error.message,
                stack: error.stack,
            });
            return { success: false, message: this.lastError || 'Connection failed' };
        }
    }

    private async connect() {
        try {
            if (!fs.existsSync(this.authFolder)) {
                fs.mkdirSync(this.authFolder, { recursive: true });
            }

            const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
            const { version } = await fetchLatestBaileysVersion();

            // Create a logger adapter for Baileys
            const baileysLogger = {
                trace: () => { }, // excessive logging
                debug: () => { }, // excessive logging
                info: (msg: any) => this.logger.log(msg),
                warn: (msg: any) => this.logger.warn(msg),
                error: (msg: any) => this.logger.error(msg),
                child: () => baileysLogger, // Baileys creates child loggers
            } as any;

            this.socket = makeWASocket({
                version,
                logger: baileysLogger,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
                },
                printQRInTerminal: true,
                browser: ['Looker', 'Chrome', '120.0.0'],
                syncFullHistory: false,
            });

            this.socket.ev.on('creds.update', saveCreds);

            this.socket.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    this.qrCode = qr;
                }

                if (connection === 'close') {
                    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                    this.logger.warn(`Connection closed (status: ${statusCode}). Reconnect: ${shouldReconnect}`);
                    this.isReady = false;

                    if (statusCode === 515) {
                        this.logger.log('ℹ️ Stream restart required, reconnecting immediately...');
                        setTimeout(() => this.connect(), 0);
                    } else if (shouldReconnect && statusCode !== 401) {
                        setTimeout(() => this.connect(), 5000);
                    } else {
                        this.socket = null;
                    }
                } else if (connection === 'open') {
                    this.isReady = true;
                    this.pairingCode = null;
                    this.qrCode = null;
                    this.logger.log('WhatsApp connected successfully!');
                }
            });
        } catch (error) {
            this.logger.error('Failed to connect:', error);
            throw error;
        }
    }

    getStatus() {
        return {
            isReady: this.isReady,
            hasPairingCode: !!this.pairingCode,
            pairingCode: this.pairingCode,
            hasQR: !!this.qrCode,
            qrCode: this.qrCode,
            phoneNumber: this.phoneNumber,
            lastError: this.lastError,
        };
    }

    async sendMessage(phone: string, message: string): Promise<boolean> {
        if (!this.isReady || !this.socket) {
            this.logger.warn('WhatsApp not ready. Cannot send message.');
            return false;
        }

        try {
            const jid = phone.replace(/\+/g, '').replace(/\D/g, '') + '@s.whatsapp.net';
            this.logger.log(`📤 Sending message to ${jid}`);
            await this.socket.sendMessage(jid, { text: message });
            this.logger.log(`✅ Message sent to ${phone}`);
            return true;
        } catch (error: any) {
            this.logger.error(`❌ Failed to send message to ${phone}:`, error.message);
            return false;
        }
    }

    async sendCompetitionAlert(phone: string, details: {
        title: string;
        whatItIs: string;
        deadline: string | null;
        link: string;
    }): Promise<boolean> {
        const message = `🏆 *${details.title}*

📝 ${details.whatItIs}
📅 Registration Date: ${details.deadline || 'See link'}
🔗 Registration Link: ${details.link}

_Sent by Looker_`;

        return this.sendMessage(phone, message);
    }

    async sendDigest(phone: string, items: Array<{
        title: string;
        whatItIs: string;
        deadline: string | null;
        link: string;
    }>): Promise<boolean> {
        const itemsList = items.map((item, i) =>
            `${i + 1}. *${item.title}*\n   ${item.whatItIs}\n   ${item.deadline ? `📅 ${item.deadline}` : ''}\n   🔗 ${item.link}`
        ).join('\n\n');

        const message = `📋 *Competition Digest* (${items.length} new)

${itemsList}

_Sent by Competition Monitor_`;

        return this.sendMessage(phone, message);
    }

    async disconnect() {
        if (this.socket) {
            try {
                await this.socket.logout();
            } catch (e) {
                this.logger.warn('Error during logout:', e);
            }
            this.socket = null;
            this.isReady = false;
            this.pairingCode = null;
            this.qrCode = null;
            this.lastError = null;

            if (fs.existsSync(this.authFolder)) {
                fs.rmSync(this.authFolder, { recursive: true });
            }

            this.logger.log('WhatsApp disconnected and session cleared');
        }
    }
}
