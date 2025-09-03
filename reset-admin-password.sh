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
    if [ ! -f "package.json" ] || [ ! -f ".env.local" ]; then
        print_error "CardVault files not found. Please run this script from the card-catalog directory."
        exit 1
    fi
    
    # Check if multi-tenant mode is enabled
    if grep -q "ENABLE_MULTI_TENANT=true" .env.local; then
        print_info "Multi-tenant mode detected, using PostgreSQL database"
        DB_MODE="postgresql"
        
        # Source database configuration
        source .env.local
        DB_NAME=${POSTGRES_DB:-cardvault_dev}
        
        # Check if admin users exist (global_admin or org_admin roles)
        admin_count=$(psql $DB_NAME -t -c "SELECT COUNT(*) FROM users WHERE role = 'global_admin' OR organization_role = 'org_admin';" | xargs)
    else
        print_info "Single-tenant mode detected, using SQLite database"
        DB_MODE="sqlite"
        
        if [ ! -f "carddb.sqlite" ]; then
            print_error "SQLite database file not found."
            exit 1
        fi
        
        # Check if admin user exists
        admin_count=$(sqlite3 carddb.sqlite "SELECT COUNT(*) FROM users WHERE username = 'admin';")
    fi
    
    if [ "$admin_count" -eq 0 ]; then
        print_error "No admin users found in database."
        if [ "$DB_MODE" = "postgresql" ]; then
            print_info "In multi-tenant mode, admin users have role = 'global_admin' or organization_role = 'org_admin'."
            print_info "You may need to create an admin user first."
        fi
        exit 1
    fi
    
    # Show available admin users and let user select
    if [ "$DB_MODE" = "postgresql" ]; then
        print_info "Available admin users:"
        psql $DB_NAME -c "SELECT username, email, role, organization_role FROM users WHERE role = 'global_admin' OR organization_role = 'org_admin';"
        echo ""
        
        while true; do
            read -p "Enter the username to reset password for: " selected_username
            if [ -n "$selected_username" ]; then
                user_exists=$(psql $DB_NAME -t -c "SELECT COUNT(*) FROM users WHERE username = '$selected_username' AND (role = 'global_admin' OR organization_role = 'org_admin');" | xargs)
                if [ "$user_exists" -eq 1 ]; then
                    break
                else
                    print_warning "User '$selected_username' not found or is not an admin user. Please try again."
                fi
            else
                print_warning "Username cannot be empty. Please try again."
            fi
        done
    else
        selected_username="admin"
    fi
    
    print_info "Resetting password for user: $selected_username"
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
        if [ "$DB_MODE" = "postgresql" ]; then
            psql $DB_NAME -c "UPDATE users SET password_hash = '$password_hash' WHERE username = '$selected_username';"
        else
            sqlite3 carddb.sqlite "UPDATE users SET password_hash = '$password_hash' WHERE username = '$selected_username';"
        fi
        
        if [ $? -eq 0 ]; then
            print_success "Admin password updated successfully"
            echo ""
            print_info "New admin login credentials:"
            print_info "  Username: $selected_username"
            print_info "  Password: [the password you just set]"
            echo ""
            print_warning "Please restart the application for changes to take effect:"
            print_info "  pkill -f 'next' && npm run dev"
        else
            print_error "Failed to update password in database"
            exit 1
        fi
    else
        print_error "Failed to generate password hash"
        exit 1
    fi
}

main "$@"