#!/bin/bash

echo "🚀 Starting Card Catalog on Alternative Port..."

# Kill any existing processes
pkill -f "next" 2>/dev/null || true
sleep 2

cd "$(dirname "$0")"

# Try different ports
for port in 3001 3002 3003 4000 5000; do
    if ! lsof -i:$port >/dev/null 2>&1; then
        echo "🌟 Starting server on port $port..."
        echo "Server will be available at http://localhost:$port"
        PORT=$port npm run dev
        break
    fi
done