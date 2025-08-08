#!/bin/bash

# Card Catalog Upgrade Script
# This script upgrades the Card Catalog application to the latest version

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Card Catalog"
BACKUP_DIR="backups"
CURRENT_DATE=$(date +"%Y%m%d_%H%M%S")

# Helper functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}    $APP_NAME Upgrader${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Stop running server
stop_server() {
    print_info "Stopping running server..."
    
    # Try multiple methods to stop the server
    if pgrep -f "next start" > /dev/null; then
        pkill -f "next start" && sleep 3
        print_success "Server stopped"
    else
        print_info "No running server found"
    fi
}

# Create backup
create_backup() {
    print_info "Creating backup..."
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Create backup filename
    BACKUP_FILE="$BACKUP_DIR/card-catalog-backup-$CURRENT_DATE.tar.gz"
    
    # Create backup excluding node_modules and backups
    tar -czf "$BACKUP_FILE" \
        --exclude='node_modules' \
        --exclude='backups' \
        --exclude='.git' \
        --exclude='*.log' \
        --exclude='.next' \
        . 2>/dev/null || true
    
    if [ -f "$BACKUP_FILE" ]; then
        print_success "Backup created: $BACKUP_FILE"
    else
        print_error "Failed to create backup"
        exit 1
    fi
}

# Pull latest code
update_code() {
    print_info "Updating code from repository..."
    
    if [ -d ".git" ]; then
        # Check if there are local changes
        if ! git diff --quiet || ! git diff --cached --quiet; then
            print_warning "Local changes detected. Stashing them..."
            git stash push -m "Pre-upgrade stash $CURRENT_DATE"
        fi
        
        # Pull latest changes
        if git pull origin main; then
            print_success "Code updated successfully"
        else
            print_error "Failed to update code"
            exit 1
        fi
    else
        print_error "Not a git repository. Please clone from GitHub first."
        exit 1
    fi
}

# Update dependencies
update_dependencies() {
    print_info "Updating dependencies..."
    
    if [ -f "package.json" ]; then
        if npm ci --silent; then
            print_success "Dependencies updated successfully"
        else
            print_error "Failed to update dependencies"
            exit 1
        fi
    else
        print_error "package.json not found"
        exit 1
    fi
}

# Run database migrations if needed
migrate_database() {
    print_info "Checking for database migrations..."
    
    # Check if database exists
    if [ -f "carddb.sqlite" ]; then
        # Create a backup of the database
        cp carddb.sqlite "carddb-backup-$CURRENT_DATE.sqlite"
        print_success "Database backup created: carddb-backup-$CURRENT_DATE.sqlite"
        
        # Run any new database migrations
        # This would be where you'd add migration logic in the future
        print_info "No database migrations needed"
    else
        print_warning "Database not found. You may need to run the initial setup."
    fi
}

# Update version info
update_version_info() {
    print_info "Updating version information..."
    
    # Update install date if this is a fresh upgrade
    if [ ! -f ".install_date" ]; then
        date +"%Y-%m-%d %H:%M:%S" > .install_date
    fi
    
    # Update upgrade date
    date +"%Y-%m-%d %H:%M:%S" > .upgrade_date
    
    print_success "Version information updated"
}

# Build application
build_application() {
    print_info "Building application..."
    
    if npm run build --silent; then
        print_success "Application built successfully"
    else
        print_error "Failed to build application"
        exit 1
    fi
}

# Start server
start_server() {
    print_info "Starting server..."
    
    # Ask if user wants to start the application now
    read -p "Would you like to start the application now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Starting $APP_NAME in background..."
        nohup ./start.sh > server.log 2>&1 &
        sleep 3
        
        if pgrep -f "next start" > /dev/null; then
            print_success "Server started successfully!"
            print_info "Server is running in background"
            print_info "Logs are being written to: server.log"
            print_info "To stop the server, use: pkill -f 'next start'"
        else
            print_error "Server failed to start. Check server.log for details."
        fi
    else
        print_info "You can start the application later using: ./start.sh"
    fi
}

# Main upgrade function
main() {
    print_header
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -f "next.config.ts" ]; then
        print_error "Upgrade files not found. Please run this script from the card-catalog directory."
        exit 1
    fi
    
    print_info "Starting upgrade of $APP_NAME..."
    echo ""
    
    # Confirm upgrade
    print_warning "This will update your Card Catalog installation to the latest version."
    read -p "Do you want to continue? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Upgrade cancelled."
        exit 0
    fi
    
    # Run upgrade steps
    stop_server
    create_backup
    update_code
    update_dependencies
    migrate_database
    update_version_info
    build_application
    start_server
    
    print_success "Upgrade completed successfully!"
    echo ""
    echo -e "${GREEN}🎉 $APP_NAME has been upgraded to the latest version!${NC}"
    echo ""
    echo -e "${BLUE}Backup created at:${NC} $BACKUP_FILE"
    echo -e "${BLUE}Upgrade completed at:${NC} $(date)"
    echo ""
    echo -e "${BLUE}If you experience any issues:${NC}"
    echo -e "  1. Check server.log for error messages"
    echo -e "  2. Restore from backup if needed"
    echo -e "  3. Contact support with the backup file"
    echo ""
}

# Run main function
main "$@"