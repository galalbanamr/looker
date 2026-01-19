#!/bin/bash

# Competition Monitor - Deployment Script for Oracle Cloud & Local
# Usage: ./deploy.sh [command]
# Commands: setup, deploy, update, logs, backup, restart

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if .env.production exists
check_env() {
    if [ ! -f "$PROJECT_DIR/.env.production" ]; then
        log_error ".env.production file not found!"
        log_info "Create it with: cp .env.example .env.production"
        log_info "Then edit it with your production values."
        exit 1
    fi
}

# Initial setup
setup() {
    log_info "Setting up the environment..."
    
    # Create SSL directory (optional if using tunnel)
    mkdir -p "$SCRIPT_DIR/ssl"
    
    # Check for environment file
    check_env
    
    # Pull latest images
    docker compose -f "$COMPOSE_FILE" pull
    
    log_info "Setup complete!"
}

# Deploy the application
deploy() {
    log_info "Deploying Competition Monitor..."
    
    check_env
    
    # Build and start containers
    docker compose -f "$COMPOSE_FILE" up -d --build
    
    # Wait for database to be ready
    log_info "Waiting for database..."
    sleep 10
    
    # Run migrations
    log_info "Running database migrations..."
    docker compose -f "$COMPOSE_FILE" exec -T api npx prisma migrate deploy
    
    log_info "Deployment complete!"
    log_info "----------------------------------------"
    log_info "Dashboard: https://car-scan.qa"
    log_info "API:       https://api.car-scan.qa"
    log_info "Tunnel:    Check logs with ./deploy.sh logs tunnel"
    log_info "----------------------------------------"
}

# Update the application (pull latest code and redeploy)
update() {
    log_info "Updating Competition Monitor..."
    
    cd "$PROJECT_DIR"
    
    # Pull latest code
    git pull
    
    # Rebuild and restart
    docker compose -f "$COMPOSE_FILE" up -d --build
    
    # Run migrations if any
    log_info "Running database migrations..."
    docker compose -f "$COMPOSE_FILE" exec -T api npx prisma migrate deploy
    
    log_info "Update complete!"
}

# Show logs
logs() {
    SERVICE=${1:-""}
    if [ -z "$SERVICE" ]; then
        docker compose -f "$COMPOSE_FILE" logs -f --tail=100
    else
        docker compose -f "$COMPOSE_FILE" logs -f --tail=100 "$SERVICE"
    fi
}

# Backup database
backup() {
    BACKUP_DIR="$PROJECT_DIR/backups"
    mkdir -p "$BACKUP_DIR"
    
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    log_info "Creating database backup..."
    docker compose -f "$COMPOSE_FILE" exec -T postgres \
        pg_dump -U competition competition_monitor > "$BACKUP_FILE"
    
    # Compress the backup
    gzip "$BACKUP_FILE"
    
    log_info "Backup saved to: ${BACKUP_FILE}.gz"
    
    # Remove backups older than 7 days
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
    log_info "Old backups cleaned up."
}

# Restart services
restart() {
    SERVICE=${1:-""}
    if [ -z "$SERVICE" ]; then
        log_info "Restarting all services..."
        docker compose -f "$COMPOSE_FILE" restart
    else
        log_info "Restarting $SERVICE..."
        docker compose -f "$COMPOSE_FILE" restart "$SERVICE"
    fi
}

# Stop services
stop() {
    log_info "Stopping all services..."
    docker compose -f "$COMPOSE_FILE" down
}

# Show status
status() {
    docker compose -f "$COMPOSE_FILE" ps
}

# Show usage
usage() {
    echo "Competition Monitor Deployment Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup     - Initial setup (create directories, check env)"
    echo "  deploy    - Build and deploy all services"
    echo "  update    - Pull latest code and redeploy"
    echo "  logs      - Show logs (optional: service name)"
    echo "  backup    - Backup the database"
    echo "  restart   - Restart services (optional: service name)"
    echo "  stop      - Stop all services"
    echo "  status    - Show service status"
    echo ""
    echo "Examples:"
    echo "  $0 deploy"
    echo "  $0 logs tunnel"
    echo "  $0 restart web"
}

# Main
case "${1:-}" in
    setup)   setup ;;
    deploy)  deploy ;;
    update)  update ;;
    logs)    logs "$2" ;;
    backup)  backup ;;
    restart) restart "$2" ;;
    stop)    stop ;;
    status)  status ;;
    *)       usage ;;
esac
