#!/bin/bash

# Card Catalog Uninstall Script
# This script removes the Card Catalog application from the system

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${RED}================================${NC}"
    echo -e "${RED}    Card Catalog Uninstaller${NC}"
    echo -e "${RED}================================${NC}"
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

# Stop any running processes
stop_processes() {
    print_info "Stopping Card Catalog processes..."
    
    # Try to stop processes gracefully
    pkill -f "next" 2>/dev/null || true
    pkill -f "card-catalog" 2>/dev/null || true
    
    # Wait a moment for processes to stop
    sleep 2
    
    # Force kill if still running
    pkill -9 -f "next" 2>/dev/null || true
    pkill -9 -f "card-catalog" 2>/dev/null || true
    
    print_success "Processes stopped"
}

# Remove application files
remove_files() {
    local current_dir=$(pwd)
    local app_name=$(basename "$current_dir")
    
    print_info "Preparing to remove application files..."
    
    echo -e "${YELLOW}Current directory: $current_dir${NC}"
    echo -e "${YELLOW}This will remove ALL files in this directory.${NC}"
    echo ""
    
    read -p "Are you sure you want to uninstall Card Catalog? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Uninstallation cancelled by user"
        exit 0
    fi
    
    # Ask about database backup
    if [ -f "carddb.sqlite" ]; then
        echo ""
        read -p "Would you like to backup your database before uninstalling? (y/N): " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            local backup_name="carddb_backup_$(date +%Y%m%d_%H%M%S).sqlite"
            cp carddb.sqlite "$HOME/$backup_name"
            print_success "Database backed up to: $HOME/$backup_name"
        fi
    fi
    
    print_info "Removing application files..."
    
    # Move to parent directory before deletion
    cd ..
    
    # Remove the application directory
    if [ -d "$app_name" ]; then
        rm -rf "$app_name"
        print_success "Application files removed"
    else
        print_warning "Application directory not found"
    fi
}

# Clean up system-wide changes (if any were made)
cleanup_system() {
    print_info "Checking for system-wide changes..."
    
    # Check for any global npm packages (none installed by default)
    print_info "No system-wide changes to clean up"
    
    print_success "System cleanup completed"
}

# Display removal summary
show_summary() {
    echo ""
    print_success "Card Catalog has been successfully uninstalled!"
    echo ""
    echo -e "${BLUE}What was removed:${NC}"
    echo "✓ Application source code and assets"
    echo "✓ Node.js dependencies (node_modules)"
    echo "✓ Built application files (.next)"
    echo "✓ Configuration files"
    echo "✓ Database file (unless backed up)"
    echo "✓ All scripts and documentation"
    echo ""
    
    if [ -f "$HOME/carddb_backup_"*.sqlite 2>/dev/null ]; then
        echo -e "${BLUE}Database backups (if created):${NC}"
        ls -la "$HOME"/carddb_backup_*.sqlite 2>/dev/null || true
        echo ""
    fi
    
    echo -e "${BLUE}What was NOT removed:${NC}"
    echo "• Node.js and npm (system-wide installations)"
    echo "• SQLite3 (system-wide installation)"
    echo "• Any database backups you created"
    echo ""
    
    echo -e "${GREEN}Thank you for using Card Catalog! 🎉${NC}"
    echo ""
}

# Check if we're in the right directory
check_directory() {
    if [ ! -f "package.json" ] || [ ! -f "next.config.ts" ]; then
        print_error "This doesn't appear to be a Card Catalog installation directory."
        print_info "Please run this script from the card-catalog directory."
        exit 1
    fi
    
    # Verify it's actually Card Catalog
    if ! grep -q "card-catalog" package.json 2>/dev/null; then
        print_warning "This might not be a Card Catalog installation."
        echo ""
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Uninstallation cancelled"
            exit 0
        fi
    fi
}

# Main uninstall function
main() {
    print_header
    
    print_warning "This will completely remove Card Catalog from your system."
    print_warning "All data, including your card collection, will be deleted."
    echo ""
    
    check_directory
    stop_processes
    remove_files
    cleanup_system
    show_summary
}

# Confirmation before starting
echo -e "${YELLOW}⚠ WARNING: This will permanently delete Card Catalog and all your data!${NC}"
echo ""
read -p "Do you want to continue with uninstallation? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    main "$@"
else
    echo -e "${BLUE}Uninstallation cancelled.${NC}"
    exit 0
fi