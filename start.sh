#!/bin/bash

# Color codes for output
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

echo "🚀 Starting CardVault Application..."

# Kill any existing processes
pkill -f "next" 2>/dev/null || true

# Wait a moment
sleep 2

# Navigate to project directory
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Clean build
echo "🧹 Cleaning build..."
rm -rf .next

# Build the application
echo "🔨 Building application..."
npm run build

# Start the server
echo "🌟 Starting server..."

# Load production environment if available
if [ -f ".env.production" ]; then
    print_info "Loading production environment configuration..."
    set -a  # Export all variables
    source .env.production
    set +a  # Stop exporting
    echo "🔧 Using NEXTAUTH_URL from .env.production: $NEXTAUTH_URL"
else
    # Detect network IP for NEXTAUTH_URL as fallback
    NETWORK_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}' || echo "localhost")
    export NEXTAUTH_URL="http://${NETWORK_IP}:3000"
    echo "🔧 Auto-detected NEXTAUTH_URL: $NEXTAUTH_URL"
    echo "💡 Run './configure-env.sh' to create permanent production configuration"
fi

echo "Server will be available at:"
echo "  - Local:   http://localhost:3000"
if [ -n "$NETWORK_IP" ] && [ "$NETWORK_IP" != "localhost" ]; then
    echo "  - Network: http://${NETWORK_IP}:3000"
fi
echo "  - All interfaces: http://0.0.0.0:3000"
echo ""
echo "🔧 NEXTAUTH_URL set to: $NEXTAUTH_URL"
echo "ℹ️  Other devices on your network can now access the application!"
echo ""
echo "✨ New Features Added:"
echo "   📊 Card Reports with manufacturer+year breakdown"
echo "   ⚙️  Full CRUD management for all data tables"
echo "   🧮 Summary statistics including cards by manufacturer & year"
echo "   🔍 Advanced filtering on Cards page (manufacturer+year, player, team, search)"
echo ""
# Start the application in background with nohup and environment variables
nohup env $(cat .env.production | xargs) npm start > server.log 2>&1 &

# Get the process ID
PID=$!

# Wait a moment to check if the process started successfully
sleep 3

if ps -p $PID > /dev/null; then
    echo "✅ Card Catalog started successfully in background"
    echo "✅ Process ID: $PID"
    echo "✅ Server logs: server.log"
    echo "✅ To stop the server, run: pkill -f 'next start'"
    echo ""
    echo "🎉 Card Catalog is now running!"
else
    echo "❌ Failed to start Card Catalog. Check server.log for errors."
    exit 1
fi