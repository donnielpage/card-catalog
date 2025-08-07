#!/bin/bash

echo "🚀 Starting Card Catalog Development Server..."

# Kill any existing processes
pkill -f "next" 2>/dev/null || true

# Wait a moment
sleep 2

# Navigate to project directory
cd "$(dirname "$0")"

# Clean and start development server
echo "🧹 Cleaning build..."
rm -rf .next

echo "🌟 Starting development server..."
echo "Server will be available at:"
echo "  - Local:   http://localhost:3000"
echo "  - Network: http://$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}'):3000"
echo "  - All interfaces: http://0.0.0.0:3000"
echo ""
echo "ℹ️  Other devices on your network can now access the application!"
echo "Press Ctrl+C to stop the server"

npm run dev