import { Controller, Post, Get, Body } from '@nestjs/common';
import { WhatsappWebService } from './whatsapp-web.service';

@Controller('whatsapp')
export class WhatsappController {
    constructor(private readonly whatsappService: WhatsappWebService) { }

    @Get('status')
    getStatus() {
        return this.whatsappService.getStatus();
    }

    @Post('pair')
    requestPairingCode(@Body() body: { phone: string }) {
        return this.whatsappService.requestPairingCode(body.phone);
    }

    @Post('disconnect')
    async disconnect() {
        await this.whatsappService.disconnect();
        return { success: true, message: 'Disconnected' };
    }

    @Post('test')
    async sendTestMessage(@Body() body: { phone: string; message: string }) {
        const sent = await this.whatsappService.sendMessage(body.phone, body.message);
        return { success: sent };
    }
}
