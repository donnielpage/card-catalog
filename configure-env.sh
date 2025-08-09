#!/bin/bash

# Environment Configuration Script for CardVault
# This script configures the environment variables for production deployment

set -e

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Detect network IP
detect_ip() {
    # Try multiple methods to get the network IP
    local ip=""
    
    # Method 1: macOS
    ip=$(ipconfig getifaddr en0 2>/dev/null)
    
    # Method 2: Linux
    if [ -z "$ip" ]; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
    
    # Method 3: Alternative Linux
    if [ -z "$ip" ]; then
        ip=$(ip route get 1 2>/dev/null | awk '{print $7}' | head -1)
    fi
    
    # Fallback
    if [ -z "$ip" ]; then
        ip="localhost"
    fi
    
    echo "$ip"
}

# Main configuration
main() {
    print_info "Configuring CardVault environment..."
    
    # Detect IP
    NETWORK_IP=$(detect_ip)
    print_info "Detected network IP: $NETWORK_IP"
    
    # Create/update .env.production
    cat > .env.production << EOF
# CardVault Production Environment Configuration
# Generated on $(date)

# NextAuth Configuration
NEXTAUTH_URL=http://${NETWORK_IP}:3000
NEXTAUTH_SECRET=cardvault-production-secret-$(openssl rand -hex 32)

# Database Configuration
DATABASE_PATH=./carddb.sqlite

# Application Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
EOF

    print_success "Environment configuration created: .env.production"
    print_info "NEXTAUTH_URL set to: http://${NETWORK_IP}:3000"
    
    # Update start.sh to use production environment
    print_info "To use this configuration, set NODE_ENV=production when starting:"
    echo "  NODE_ENV=production ./start.sh"
    echo ""
    print_warning "Make sure to restart the application after running this script"
}

# Run main function
main "$@"