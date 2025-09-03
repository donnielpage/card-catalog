#!/bin/bash

# Environment Fix Script for CardVault
# This script creates the missing .env.local file with NEXTAUTH_SECRET

set -e

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

main() {
    print_info "Setting up environment configuration..."
    
    if [ ! -f ".env.local" ]; then
        # Generate a random secret for NextAuth
        local nextauth_secret
        if command_exists openssl; then
            nextauth_secret=$(openssl rand -base64 32)
        elif command_exists node; then
            nextauth_secret=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
        else
            # Fallback to a unique but less secure method
            nextauth_secret="cardvault-$(date +%s)-$(hostname | tr -d '[:space:]')"
        fi
        
        # Create .env.local file
        cat > .env.local << EOF
NEXTAUTH_SECRET=$nextauth_secret
# NEXTAUTH_URL will be automatically detected when not set
# Uncomment and modify the line below if you need to set a specific URL:
# NEXTAUTH_URL=http://your-server-ip:3000
EOF
        print_success "Environment configuration created (.env.local)"
        echo ""
        print_info "You can now run the build with environment variables:"
        print_info "  NEXTAUTH_SECRET=\$(grep '^NEXTAUTH_SECRET=' .env.local | cut -d'=' -f2-) BUILDING=true npm run build"
    else
        print_success "Environment configuration already exists"
    fi
}

main "$@"