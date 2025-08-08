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
# Start the application in background with nohup
nohup npm start > server.log 2>&1 &

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