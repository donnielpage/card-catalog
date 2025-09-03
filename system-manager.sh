#!/bin/bash

# Card Catalog System Management Tool
# This script provides system management functions including backups and version checks

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Card Catalog"
BACKUP_DIR="backups"
CURRENT_DATE=$(date +"%Y%m%d_%H%M%S")
GITHUB_REPO="donnielpage/card-catalog"
GITHUB_API="https://api.github.com/repos/$GITHUB_REPO"

# Helper functions
print_header() {
    clear
    echo -e "${PURPLE}╔══════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║        $APP_NAME System Manager      ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════╝${NC}"
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

# Get current version
get_current_version() {
    if [ -f "package.json" ]; then
        grep '"version"' package.json | sed 's/.*"version": "\([^"]*\)".*/\1/'
    else
        echo "unknown"
    fi
}

# Get install date
get_install_date() {
    if [ -f ".install_date" ]; then
        cat .install_date
    else
        echo "Unknown"
    fi
}

# Create database backup
backup_database() {
    print_info "Creating database backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    if [ -f "carddb.sqlite" ]; then
        local backup_file="$BACKUP_DIR/carddb-backup-$CURRENT_DATE.sqlite"
        cp carddb.sqlite "$backup_file"
        
        # Verify backup
        if [ -f "$backup_file" ]; then
            local original_size=$(wc -c < carddb.sqlite)
            local backup_size=$(wc -c < "$backup_file")
            
            if [ "$original_size" -eq "$backup_size" ]; then
                print_success "Database backup created: $backup_file"
                return 0
            else
                print_error "Database backup verification failed"
                return 1
            fi
        else
            print_error "Failed to create database backup"
            return 1
        fi
    else
        print_warning "No database file found to backup"
        return 1
    fi
}

# Create image backup
backup_images() {
    print_info "Creating image backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "public/uploads" ] && [ "$(ls -A public/uploads 2>/dev/null)" ]; then
        local backup_file="$BACKUP_DIR/images-backup-$CURRENT_DATE.tar.gz"
        
        if tar -czf "$backup_file" -C public uploads/ 2>/dev/null; then
            local file_count=$(find public/uploads -type f | wc -l | tr -d ' ')
            print_success "Image backup created: $backup_file ($file_count files)"
            return 0
        else
            print_error "Failed to create image backup"
            return 1
        fi
    else
        print_warning "No images found to backup"
        return 1
    fi
}

# Create full system backup
backup_system() {
    print_info "Creating full system backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    local backup_file="$BACKUP_DIR/system-backup-$CURRENT_DATE.tar.gz"
    
    print_info "Backing up application files..."
    if tar -czf "$backup_file" \
        --exclude='node_modules' \
        --exclude='backups' \
        --exclude='.git' \
        --exclude='*.log' \
        --exclude='.next' \
        . 2>/dev/null; then
        
        print_success "Full system backup created: $backup_file"
        
        # Show backup details
        local backup_size=$(du -sh "$backup_file" | cut -f1)
        print_info "Backup size: $backup_size"
        return 0
    else
        print_error "Failed to create system backup"
        return 1
    fi
}

# Check for newer version
check_version() {
    print_info "Checking for newer version..."
    
    if ! command_exists curl; then
        print_error "curl is required for version checking"
        return 1
    fi
    
    local current_version=$(get_current_version)
    print_info "Current version: $current_version"
    
    # Get latest release from GitHub API
    local latest_version=$(curl -s "$GITHUB_API/releases/latest" | grep '"tag_name"' | sed 's/.*"tag_name": "v\?\([^"]*\)".*/\1/' 2>/dev/null)
    
    if [ -z "$latest_version" ] || [ "$latest_version" = "null" ]; then
        # Fallback: check main branch for package.json version
        latest_version=$(curl -s "$GITHUB_API/contents/package.json" | grep '"download_url"' | sed 's/.*"download_url": "\([^"]*\)".*/\1/' | xargs curl -s 2>/dev/null | grep '"version"' | sed 's/.*"version": "\([^"]*\)".*/\1/' 2>/dev/null)
    fi
    
    if [ -n "$latest_version" ] && [ "$latest_version" != "null" ]; then
        print_info "Latest version: $latest_version"
        
        if [ "$current_version" = "$latest_version" ]; then
            print_success "You are running the latest version!"
        else
            print_warning "A newer version is available: $latest_version"
            echo ""
            echo -e "${CYAN}To upgrade to the latest version:${NC}"
            echo -e "  1. Run: ${YELLOW}./upgrade.sh${NC}"
            echo -e "  2. Or manually: ${YELLOW}git pull origin main${NC}"
            echo ""
            
            read -p "Would you like to run the upgrade now? (y/n): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                if [ -f "upgrade.sh" ]; then
                    print_info "Starting upgrade process..."
                    exec ./upgrade.sh
                else
                    print_error "upgrade.sh not found"
                    return 1
                fi
            fi
        fi
    else
        print_error "Unable to check for updates. Please check your internet connection."
        return 1
    fi
}

# List existing backups
list_backups() {
    print_info "Existing backups:"
    echo ""
    
    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
        echo -e "${CYAN}Database Backups:${NC}"
        ls -lh "$BACKUP_DIR"/*sqlite* 2>/dev/null | awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}' || echo "  No database backups found"
        
        echo ""
        echo -e "${CYAN}Image Backups:${NC}"
        ls -lh "$BACKUP_DIR"/*images* 2>/dev/null | awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}' || echo "  No image backups found"
        
        echo ""
        echo -e "${CYAN}System Backups:${NC}"
        ls -lh "$BACKUP_DIR"/*system* 2>/dev/null | awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}' || echo "  No system backups found"
    else
        print_warning "No backups directory found or no backups exist"
    fi
}

# Show system information
show_system_info() {
    print_info "System Information:"
    echo ""
    
    local current_version=$(get_current_version)
    local install_date=$(get_install_date)
    
    echo -e "${CYAN}Application:${NC}"
    echo -e "  Name: $APP_NAME"
    echo -e "  Version: $current_version"
    echo -e "  Install Date: $install_date"
    echo ""
    
    echo -e "${CYAN}Database:${NC}"
    if [ -f "carddb.sqlite" ]; then
        local db_size=$(du -sh carddb.sqlite | cut -f1)
        local db_modified=$(stat -f "%Sm" carddb.sqlite 2>/dev/null || stat -c "%y" carddb.sqlite 2>/dev/null || echo "Unknown")
        echo -e "  File: carddb.sqlite"
        echo -e "  Size: $db_size"
        echo -e "  Modified: $db_modified"
    else
        echo -e "  Status: No database file found"
    fi
    echo ""
    
    echo -e "${CYAN}Images:${NC}"
    if [ -d "public/uploads" ]; then
        local image_count=$(find public/uploads -type f 2>/dev/null | wc -l | tr -d ' ')
        local upload_size=$(du -sh public/uploads 2>/dev/null | cut -f1 || echo "0B")
        echo -e "  Directory: public/uploads"
        echo -e "  Files: $image_count"
        echo -e "  Size: $upload_size"
    else
        echo -e "  Status: No uploads directory found"
    fi
    echo ""
    
    echo -e "${CYAN}Server Status:${NC}"
    if pgrep -f "next start" > /dev/null; then
        local pid=$(pgrep -f "next start")
        echo -e "  Status: Running (PID: $pid)"
        echo -e "  URL: http://localhost:3000"
    else
        echo -e "  Status: Stopped"
    fi
}

# Show main menu
show_menu() {
    print_header
    show_system_info
    echo ""
    echo -e "${PURPLE}System Management Options:${NC}"
    echo ""
    echo -e "  ${CYAN}1.${NC} Backup Database"
    echo -e "  ${CYAN}2.${NC} Backup Images"
    echo -e "  ${CYAN}3.${NC} Full System Backup"
    echo -e "  ${CYAN}4.${NC} List Existing Backups"
    echo -e "  ${CYAN}5.${NC} Check for Updates"
    echo -e "  ${CYAN}6.${NC} System Information"
    echo -e "  ${CYAN}0.${NC} Exit"
    echo ""
}

# Main menu loop
main_menu() {
    while true; do
        show_menu
        read -p "Select an option (0-6): " choice
        echo ""
        
        case $choice in
            1)
                backup_database
                echo ""
                read -p "Press Enter to continue..." -r
                ;;
            2)
                backup_images
                echo ""
                read -p "Press Enter to continue..." -r
                ;;
            3)
                backup_system
                echo ""
                read -p "Press Enter to continue..." -r
                ;;
            4)
                list_backups
                echo ""
                read -p "Press Enter to continue..." -r
                ;;
            5)
                check_version
                echo ""
                read -p "Press Enter to continue..." -r
                ;;
            6)
                print_header
                show_system_info
                echo ""
                read -p "Press Enter to continue..." -r
                ;;
            0)
                print_info "Exiting System Manager..."
                exit 0
                ;;
            *)
                print_error "Invalid option. Please select 0-6."
                sleep 2
                ;;
        esac
    done
}

# Check if we're in the right directory
check_environment() {
    if [ ! -f "package.json" ] || [ ! -f "next.config.ts" ]; then
        print_error "System Manager must be run from the card-catalog directory."
        exit 1
    fi
}

# Main function
main() {
    check_environment
    main_menu
}

# Run main function
main "$@"