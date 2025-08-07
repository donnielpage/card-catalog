#!/bin/bash

echo "🚀 Starting Card Catalog Application..."

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
echo "Server will be available at:"
echo "  - Local:   http://localhost:3000"
echo "  - Network: http://$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}'):3000"
echo "  - All interfaces: http://0.0.0.0:3000"
echo ""
echo "ℹ️  Other devices on your network can now access the application!"
echo ""
echo "✨ New Features Added:"
echo "   📊 Card Reports with manufacturer+year breakdown"
echo "   ⚙️  Full CRUD management for all data tables"
echo "   🧮 Summary statistics including cards by manufacturer & year"
echo "   🔍 Advanced filtering on Cards page (manufacturer+year, player, team, search)"
echo ""
npm start