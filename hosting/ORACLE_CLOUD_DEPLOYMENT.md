# Oracle Cloud Free Tier Deployment Guide

Complete guide to deploy the Competition Monitor stack on Oracle Cloud's **Always Free** tier.

---

## 📋 What You'll Get (100% Free Forever)

| Resource | Specs |
|----------|-------|
| **Compute** | ARM-based VM with 24GB RAM, 4 OCPUs |
| **Storage** | 200GB block storage |
| **Bandwidth** | 10TB/month outbound |
| **Public IP** | 1 reserved public IP |

---

## Part 1: Create Oracle Cloud Account

### Step 1.1: Sign Up
1. Go to [cloud.oracle.com](https://cloud.oracle.com)
2. Click **"Start for free"**
3. Enter your email and create a password
4. Complete verification (credit card required but **won't be charged**)

> [!IMPORTANT]
> Choose a **Home Region** close to your users (e.g., `Middle East (UAE)` for Qatar). 
> You **cannot change this later** and free tier resources are only available in your home region.

### Step 1.2: Wait for Account Activation
- Takes 5-30 minutes
- You'll receive an email when ready

---

## Part 2: Create the Free ARM VM

### Step 2.1: Navigate to Compute
1. Log into Oracle Cloud Console
2. Click hamburger menu (☰) → **Compute** → **Instances**
3. Click **"Create Instance"**

### Step 2.2: Configure Instance
| Setting | Value |
|---------|-------|
| **Name** | `competition-monitor` |
| **Placement** | Default (AD-1) |
| **Image** | Ubuntu 22.04 (Canonical) |
| **Shape** | Click "Change Shape" → **Ampere** → `VM.Standard.A1.Flex` |
| **OCPUs** | 4 (max free) |
| **Memory** | 24 GB (max free) |

### Step 2.3: Configure Networking
1. Create a new VCN or use default
2. Ensure "Assign a public IPv4 address" is **checked**

### Step 2.4: Add SSH Key
**Option A**: Let Oracle generate (download the private key!)
**Option B**: Paste your existing public key (`~/.ssh/id_rsa.pub`)

### Step 2.5: Boot Volume
- Leave default (46.6 GB is plenty)
- Check "Specify a custom boot volume size" for up to 200GB if needed

### Step 2.6: Click "Create"
Wait 2-5 minutes for provisioning.

---

## Part 3: Configure Firewall (Security List)

Oracle blocks all ports by default. You need to open them.

### Step 3.1: Add Ingress Rules
1. Go to **Networking** → **Virtual Cloud Networks**
2. Click your VCN → **Security Lists** → **Default Security List**
3. Click **"Add Ingress Rules"**

Add these rules:

| Source CIDR | Protocol | Destination Port | Description |
|-------------|----------|------------------|-------------|
| `0.0.0.0/0` | TCP | 80 | HTTP |
| `0.0.0.0/0` | TCP | 443 | HTTPS |
| `0.0.0.0/0` | TCP | 3000 | Next.js (temporary) |
| `0.0.0.0/0` | TCP | 4100 | API (temporary) |

---

## Part 4: Initial Server Setup

### Step 4.1: SSH into Your Server
```bash
ssh -i /path/to/your-private-key ubuntu@<YOUR_PUBLIC_IP>
```

### Step 4.2: Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### Step 4.3: Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (no sudo needed)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Log out and back in for group changes
exit
```

SSH back in after logging out.

### Step 4.4: Install Node.js (for building locally if needed)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y
```

### Step 4.5: Configure Ubuntu Firewall
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 4100 -j ACCEPT
sudo netfilter-persistent save
```

---

## Part 5: Deploy Your Application

### Step 5.1: Clone Your Repository
```bash
cd ~
git clone <YOUR_REPO_URL> competition-monitor
cd competition-monitor
```

### Step 5.2: Create Environment File
```bash
nano .env.production
```

Add your environment variables:
```env
# Database
DATABASE_URL=postgresql://competition:competition123@postgres:5432/competition_monitor

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# API
PORT=4100
NODE_ENV=production

# Frontend URL (replace with your domain or IP)
FRONTEND_URL=http://<YOUR_PUBLIC_IP>:3000

# Firebase (paste your service account JSON as base64)
# Generate with: cat firebase-service-account.json | base64 -w 0
FIREBASE_SERVICE_ACCOUNT_BASE64=<your-base64-encoded-service-account>

# WhatsApp Session Directory
WHATSAPP_SESSION_DIR=/app/whatsapp-sessions
```

### Step 5.3: Create Production Docker Compose
The file `hosting/docker-compose.prod.yml` is already created in your repo.

### Step 5.4: Build and Start Services
```bash
cd ~/competition-monitor/hosting
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 5.5: Run Database Migrations
```bash
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

### Step 5.6: Verify Everything is Running
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

---

## Part 6: Set Up Domain & SSL (Optional but Recommended)

### Step 6.1: Point Your Domain
Add an A record in your DNS:
```
Type: A
Name: @ (or subdomain)
Value: <YOUR_ORACLE_IP>
TTL: 300
```

### Step 6.2: Install Certbot for Free SSL
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Step 6.3: Get SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Part 7: Maintenance Commands

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web
```

### Restart Services
```bash
docker compose -f docker-compose.prod.yml restart
```

### Update Application
```bash
cd ~/competition-monitor
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### Database Backup
```bash
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U competition competition_monitor > backup_$(date +%Y%m%d).sql
```

### Access PostgreSQL
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U competition -d competition_monitor
```

### Access Redis CLI
```bash
docker compose -f docker-compose.prod.yml exec redis redis-cli
```

---

## 🔧 Troubleshooting

### "Cannot connect to server"
1. Check Oracle Security List (ingress rules)
2. Check Ubuntu iptables: `sudo iptables -L -n`
3. Verify containers are running: `docker ps`

### "Database connection refused"
- Wait 30 seconds after starting containers
- Check DATABASE_URL in `.env.production`

### "Out of memory"
- ARM VM has 24GB, should be plenty
- Check usage: `docker stats`

### WhatsApp session issues
- Sessions are persisted in a Docker volume
- If issues, remove volume: `docker volume rm hosting_whatsapp_sessions`

---

## 📊 Resource Usage Estimate

| Service | RAM | CPU |
|---------|-----|-----|
| PostgreSQL | ~500MB | Low |
| Redis | ~50MB | Very Low |
| NestJS API | ~300MB | Low-Medium |
| Next.js | ~200MB | Low |
| Nginx | ~10MB | Very Low |
| **Total** | **~1.1GB** | Well under limits |

You have 24GB RAM - this is more than enough!

---

## 🎉 You're Done!

Your application should now be accessible at:
- **Frontend**: `http://<YOUR_IP>:3000` (or your domain)
- **API**: `http://<YOUR_IP>:4100`

For production, set up Nginx reverse proxy (included in docker-compose.prod.yml) to serve everything on port 80/443.
