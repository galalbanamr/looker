import { Module, forwardRef } from '@nestjs/common';
import { WhatsappWebService } from './whatsapp-web.service';
import { WhatsappController } from './whatsapp.controller';

@Module({
    controllers: [WhatsappController],
    providers: [WhatsappWebService],
    exports: [WhatsappWebService],
})
export class NotificationModule { }
