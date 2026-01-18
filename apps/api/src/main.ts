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
            'http://localhost:3002',
            'http://localhost:3003',
            'http://localhost:3004',
            'http://localhost:3005',
        ],
        credentials: true,
    });

    const port = process.env.PORT || 3001;
    await app.listen(4100);
    console.log(`🚀 API running on http://localhost:${port}`);
}

bootstrap();
