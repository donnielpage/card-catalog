#!/bin/bash

# Card Catalog Installation Script
# This script installs the Card Catalog application on a new system

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Card Catalog"
APP_DIR="card-catalog"
DEFAULT_PORT=3000
NODE_MIN_VERSION="18.0.0"
NPM_MIN_VERSION="9.0.0"

# Helper functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}    $APP_NAME Installer${NC}"
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

# Version comparison function
version_ge() {
    [ "$(printf '%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

# Check system requirements
check_requirements() {
    print_info "Checking system requirements..."
    
    local requirements_met=true
    
    # Check operating system
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        print_success "Operating System: Linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        print_success "Operating System: macOS"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        print_warning "Operating System: Windows (using Unix environment)"
    else
        print_error "Unsupported operating system: $OSTYPE"
        requirements_met=false
    fi
    
    # Check Node.js
    if command_exists node; then
        local node_version=$(node --version | sed 's/v//')
        if version_ge "$node_version" "$NODE_MIN_VERSION"; then
            print_success "Node.js: v$node_version (>= $NODE_MIN_VERSION required)"
        else
            print_error "Node.js version $node_version is too old. Please install Node.js >= $NODE_MIN_VERSION"
            requirements_met=false
        fi
    else
        print_error "Node.js is not installed. Please install Node.js >= $NODE_MIN_VERSION"
        print_info "Visit: https://nodejs.org/"
        requirements_met=false
    fi
    
    # Check npm
    if command_exists npm; then
        local npm_version=$(npm --version)
        if version_ge "$npm_version" "$NPM_MIN_VERSION"; then
            print_success "npm: v$npm_version (>= $NPM_MIN_VERSION required)"
        else
            print_warning "npm version $npm_version is old. Consider upgrading: npm install -g npm@latest"
        fi
    else
        print_error "npm is not installed"
        requirements_met=false
    fi
    
    # Check available disk space (at least 500MB)
    local available_space=$(df . | tail -1 | awk '{print $4}')
    if [ "$available_space" -gt 512000 ]; then
        print_success "Disk space: Sufficient ($(echo "scale=1; $available_space/1024/1024" | bc 2>/dev/null || echo "500+")GB available)"
    else
        print_warning "Low disk space. At least 500MB recommended"
    fi
    
    # Check if git is available (optional)
    if command_exists git; then
        print_success "Git: Available (v$(git --version | awk '{print $3}'))"
    else
        print_warning "Git not found (optional for updates)"
    fi
    
    if [ "$requirements_met" = false ]; then
        print_error "System requirements not met. Please install missing dependencies."
        exit 1
    fi
    
    echo ""
}

# Check if port is available
check_port() {
    local port=$1
    if command_exists lsof; then
        if lsof -i:$port >/dev/null 2>&1; then
            return 1
        fi
    elif command_exists netstat; then
        if netstat -an | grep -q ":$port "; then
            return 1
        fi
    fi
    return 0
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    
    if [ -f "package.json" ]; then
        if npm ci --silent; then
            print_success "Dependencies installed successfully"
        else
            print_error "Failed to install dependencies"
            exit 1
        fi
    else
        print_error "package.json not found"
        exit 1
    fi
    
    echo ""
}

# Create install date file
create_install_date() {
    date +"%Y-%m-%d %H:%M:%S" > .install_date
    print_success "Install date recorded"
}

# Setup environment configuration
setup_environment() {
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
        print_success "Environment configuration created"
    else
        print_success "Environment configuration already exists"
    fi
    
    echo ""
}

# Create admin user with custom password
create_admin_user() {
    print_info "Setting up admin user..."
    echo ""
    echo "🔐 Admin Account Setup"
    echo "Please create a secure password for the admin account."
    echo ""
    
    # Get admin password
    while true; do
        read -s -p "Enter admin password: " admin_password
        echo ""
        read -s -p "Confirm admin password: " admin_password_confirm
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
        # Insert admin user into database
        sqlite3 carddb.sqlite "INSERT INTO users (username, email, firstname, lastname, password_hash, role) VALUES ('admin', 'admin@cardvault.com', 'Admin', 'User', '$password_hash', 'admin');"
        print_success "Admin user created successfully"
        echo ""
        print_info "Admin login credentials:"
        print_info "  Username: admin"
        print_info "  Password: [the password you just set]"
    else
        print_error "Failed to generate password hash"
        exit 1
    fi
    
    echo ""
}

# Initialize database
initialize_database() {
    print_info "Initializing database..."
    
    # Remove existing database for truly fresh install
    if [ -f "carddb.sqlite" ]; then
        print_warning "Removing existing database for fresh install..."
        rm carddb.sqlite
    fi
    
    if [ -f "create_database.sql" ]; then
        if command_exists sqlite3; then
            sqlite3 carddb.sqlite < create_database.sql
            print_success "Database initialized"
            
            # Create admin user with custom password
            create_admin_user
            
            # Check if sample data should be loaded
            read -p "Would you like to load sample data? (y/n): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                if [ -f "sample_data.sql" ]; then
                    # Load sample data but skip admin user (already created)
                    grep -v "INSERT.*admin.*cardvault.com" sample_data.sql | sqlite3 carddb.sqlite
                    print_success "Sample data loaded"
                else
                    print_warning "Sample data file not found"
                fi
            fi
        else
            print_error "SQLite3 not found. Please install SQLite3"
            exit 1
        fi
    else
        print_error "Database schema file not found"
        exit 1
    fi
    
    echo ""
}

# Build application
build_application() {
    print_info "Building application..."
    
    # Load and export NEXTAUTH_SECRET for the build process
    if [ -f ".env.local" ]; then
        local nextauth_secret
        nextauth_secret=$(grep '^NEXTAUTH_SECRET=' .env.local | cut -d'=' -f2-)
        if [ -n "$nextauth_secret" ]; then
            export NEXTAUTH_SECRET="$nextauth_secret"
            export BUILDING="true"
            print_info "NEXTAUTH_SECRET loaded for build process"
        else
            print_error "NEXTAUTH_SECRET not found in .env.local"
            exit 1
        fi
    else
        print_error ".env.local file not found"
        exit 1
    fi
    
    if NEXTAUTH_SECRET="$nextauth_secret" BUILDING="true" npm run build; then
        print_success "Application built successfully"
    else
        print_error "Failed to build application"
        exit 1
    fi
    
    echo ""
}

# Create service scripts
create_service_scripts() {
    print_info "Creating service scripts..."
    
    # Make existing scripts executable
    chmod +x start.sh 2>/dev/null || true
    chmod +x dev.sh 2>/dev/null || true
    chmod +x start-alt.sh 2>/dev/null || true
    
    print_success "Service scripts configured"
    echo ""
}

# Find available port
find_available_port() {
    local port=$DEFAULT_PORT
    while ! check_port $port; do
        port=$((port + 1))
        if [ $port -gt 65535 ]; then
            print_error "No available ports found"
            exit 1
        fi
    done
    echo $port
}

# Main installation function
main() {
    print_header
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -f "next.config.ts" ]; then
        print_error "Installation files not found. Please run this script from the card-catalog directory."
        exit 1
    fi
    
    print_info "Starting installation of $APP_NAME..."
    echo ""
    
    # Run checks and installation steps
    check_requirements
    install_dependencies
    create_install_date
    setup_environment
    initialize_database
    build_application
    create_service_scripts
    
    # Find available port
    local available_port=$(find_available_port)
    
    print_success "Installation completed successfully!"
    echo ""
    echo -e "${GREEN}🎉 $APP_NAME is now installed and ready to use!${NC}"
    echo ""
    echo -e "${BLUE}To start the application:${NC}"
    echo -e "  ${YELLOW}./start.sh${NC}           - Production server"
    echo -e "  ${YELLOW}./dev.sh${NC}             - Development server"
    echo -e "  ${YELLOW}./start-alt.sh${NC}       - Alternative port if 3000 is busy"
    echo ""
    echo -e "${BLUE}The application will be available at:${NC}"
    echo -e "  ${YELLOW}http://localhost:$available_port${NC}"
    echo ""
    echo -e "${BLUE}Features included:${NC}"
    echo -e "  📊 Card Reports with manufacturer+year breakdown"
    echo -e "  ⚙️  Full CRUD management for all data tables"
    echo -e "  🧮 Summary statistics including cards by manufacturer & year"
    echo -e "  🔍 Advanced filtering (manufacturer+year, player, team, search)"
    echo ""
    echo -e "${BLUE}For support, check:${NC}"
    echo -e "  📖 README.md - General documentation"
    echo -e "  🔧 TECHNICAL_FIXES.md - Technical details"
    echo -e "  🔍 FILTER_FEATURES.md - Filter usage guide"
    echo ""
    
    # Ask if user wants to start the application now
    read -p "Would you like to start the application now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Starting $APP_NAME in background..."
        nohup ./start.sh > server.log 2>&1 &
        sleep 2
        print_success "Server started successfully!"
        print_info "Server is running in background (PID: $!)"
        print_info "Logs are being written to: server.log"
        print_info "To stop the server, use: pkill -f 'next start'"
    else
        print_info "You can start the application later using: ./start.sh"
    fi
}

# Run main function
main "$@"