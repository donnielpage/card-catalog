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

# Initialize database
initialize_database() {
    print_info "Initializing database..."
    
    if [ -f "create_database.sql" ]; then
        if command_exists sqlite3; then
            sqlite3 carddb.sqlite < create_database.sql
            print_success "Database initialized"
            
            # Check if sample data should be loaded
            read -p "Would you like to load sample data? (y/n): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                if [ -f "sample_data.sql" ]; then
                    sqlite3 carddb.sqlite < sample_data.sql
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
    
    if npm run build --silent; then
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