#!/bin/bash

# Start CardVault with microservices architecture
echo "🚀 Starting CardVault Microservices..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Create .env file for media service if it doesn't exist
if [ ! -f "./media-service/.env" ]; then
    echo "📝 Creating .env file for media service..."
    cp ./media-service/.env.example ./media-service/.env
fi

# Install dependencies for media service
echo "📦 Installing media service dependencies..."
cd media-service && npm install && cd ..

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Health checks
echo "🔍 Checking service health..."

check_service() {
    local service=$1
    local url=$2
    local max_attempts=5
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null; then
            echo "✅ $service is healthy"
            return 0
        else
            echo "⏳ $service not ready yet (attempt $attempt/$max_attempts)..."
            sleep 5
            ((attempt++))
        fi
    done
    
    echo "❌ $service failed to start"
    return 1
}

check_service "API Gateway" "http://localhost:8080/health"
check_service "Media Service" "http://localhost:3001/health"
check_service "Main App" "http://localhost:3000/api/health"

echo ""
echo "🎉 CardVault Microservices are running!"
echo ""
echo "📡 Services:"
echo "   API Gateway:    http://localhost:8080"
echo "   Main App:       http://localhost:3000"
echo "   Media Service:  http://localhost:3001"
echo "   PostgreSQL:     localhost:5432"
echo "   Redis:          localhost:6379"
echo ""
echo "📊 To start monitoring:"
echo "   docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d"
echo "   Prometheus:     http://localhost:9090"
echo "   Grafana:        http://localhost:3100 (admin/admin)"
echo ""
echo "🛑 To stop:"
echo "   docker-compose down"