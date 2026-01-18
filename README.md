# Competition Monitor

AI-powered competition and event monitoring with WhatsApp notifications.

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- WhatsApp account for notifications

### 1. Start Database

```bash
docker-compose up -d
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cd apps/api
cp env.example .env
# Edit .env with your settings:
# - PERPLEXITY_API_KEY=your-api-key
# - Other settings as needed
```

### 4. Initialize Database

```bash
npm run db:generate
npm run db:migrate
```

### 5. Start Development Servers

```bash
npm run dev
```

This starts:
- API: http://localhost:4100
- Web: http://localhost:3005

### 6. Connect WhatsApp

1. Go to http://localhost:4100/whatsapp/status to check connection
2. POST to http://localhost:4100/whatsapp/pair with your phone number
3. Enter the pairing code in WhatsApp → Linked Devices → Link with phone number

## Features

- 🔍 **AI-Powered Search**: Uses Perplexity to find competitions and events
- 📱 **WhatsApp Alerts**: Instant notifications via WhatsApp Web
- 🎯 **Smart Deduplication**: Never get notified twice for the same event
- ⏰ **Scheduled Runs**: Automatic searches multiple times per day
- 📊 **Dashboard**: Track your search profiles and discovered items

## Architecture

```
competition-monitor/
├── apps/
│   ├── api/          # NestJS Backend
│   └── web/          # Next.js Frontend
├── packages/
│   └── shared/       # Shared types
└── docker-compose.yml
```

## API Endpoints

### Auth
- `POST /auth/send-otp` - Send OTP to WhatsApp
- `POST /auth/verify-otp` - Verify OTP and get token
- `GET /auth/me` - Get current user

### Profiles
- `GET /profiles` - List all profiles
- `POST /profiles` - Create new profile
- `GET /profiles/:id` - Get profile details
- `PUT /profiles/:id` - Update profile
- `DELETE /profiles/:id` - Delete profile
- `POST /profiles/:id/run` - Run discovery now
- `POST /profiles/:id/toggle` - Toggle active state

### WhatsApp
- `GET /whatsapp/status` - Connection status
- `POST /whatsapp/pair` - Request pairing code
- `POST /whatsapp/disconnect` - Disconnect session

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| REDIS_URL | Redis connection string | Yes |
| JWT_SECRET | Secret for JWT tokens | Yes |
| PERPLEXITY_API_KEY | Perplexity API key | Yes |
| WEB_URL | Frontend URL for CORS (http://localhost:3002) | No |
