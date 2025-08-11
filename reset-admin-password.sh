#!/bin/bash

# Admin Password Reset Script for CardVault
# This script resets the admin user password

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}    Admin Password Reset${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

main() {
    print_header
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -f "carddb.sqlite" ]; then
        print_error "CardVault files not found. Please run this script from the card-catalog directory."
        exit 1
    fi
    
    # Check if admin user exists
    admin_count=$(sqlite3 carddb.sqlite "SELECT COUNT(*) FROM users WHERE username = 'admin';")
    
    if [ "$admin_count" -eq 0 ]; then
        print_error "Admin user not found in database."
        exit 1
    fi
    
    print_info "Resetting password for admin user..."
    echo ""
    
    # Get new admin password
    while true; do
        read -s -p "Enter new admin password: " admin_password
        echo ""
        read -s -p "Confirm new admin password: " admin_password_confirm
        echo ""
        
        if [ "$admin_password" = "$admin_password_confirm" ]; then
            if [ ${#admin_password} -lt 8 ]; then
                print_warning "Password must be at least 8 characters long"
                echo ""
                continue
            fi
            break
        else
            print_warning "Passwords do not match. Please try again."
            echo ""
        fi
    done
    
    # Generate password hash using Node.js
    print_info "Generating secure password hash..."
    local password_hash
    password_hash=$(node -e "
        const bcrypt = require('bcryptjs');
        const hash = bcrypt.hashSync(process.argv[1], 12);
        console.log(hash);
    " "$admin_password")
    
    if [ $? -eq 0 ] && [ -n "$password_hash" ]; then
        # Update admin user password
        sqlite3 carddb.sqlite "UPDATE users SET password_hash = '$password_hash' WHERE username = 'admin';"
        print_success "Admin password updated successfully"
        echo ""
        print_info "New admin login credentials:"
        print_info "  Username: admin"
        print_info "  Password: [the password you just set]"
        echo ""
        print_warning "Please restart the application for changes to take effect:"
        print_info "  pkill -f 'next start' && ./start.sh"
    else
        print_error "Failed to generate password hash"
        exit 1
    fi
}

main "$@"