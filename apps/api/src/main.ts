import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.use(cookieParser());

    app.enableCors({
        origin: [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://car-scan.qa',
            'https://www.car-scan.qa',
            'https://api.car-scan.qa',
        ],
        credentials: true,
    });

    const port = process.env.PORT || 3001;
    await app.listen(4100);
    console.log(`🚀 API running on http://localhost:${port}`);
}

bootstrap();
