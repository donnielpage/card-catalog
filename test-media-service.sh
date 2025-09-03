#!/bin/bash

# Test script for Media Service functionality
echo "🧪 Testing Media Service..."

BASE_URL="http://localhost:3001"
API_URL="http://localhost:8080"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=$3
    
    echo -n "Testing $name... "
    
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $status)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected HTTP $expected_status, got $status)"
        return 1
    fi
}

# Test with authentication (this will fail without proper JWT)
test_endpoint_with_auth() {
    local name=$1
    local url=$2
    
    echo -n "Testing $name (no auth)... "
    
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status" -eq "401" ]; then
        echo -e "${GREEN}✅ PASS${NC} (Properly requires auth - HTTP 401)"
        return 0
    else
        echo -e "${YELLOW}⚠️  UNEXPECTED${NC} (Got HTTP $status, expected 401 for auth required)"
        return 1
    fi
}

echo "Testing direct Media Service endpoints:"
test_endpoint "Health Check" "$BASE_URL/health" 200
test_endpoint_with_auth "Upload Endpoint" "$BASE_URL/api/upload"
test_endpoint_with_auth "QR Generation" "$BASE_URL/api/mobile-upload/qr"

echo ""
echo "Testing through API Gateway:"
test_endpoint "Gateway Health" "$API_URL/health" 200
test_endpoint "Gateway Media Health" "$API_URL/health/media-service" 200
test_endpoint_with_auth "Gateway Upload" "$API_URL/api/upload"
test_endpoint_with_auth "Gateway Mobile Upload" "$API_URL/api/mobile-upload/qr"

echo ""
echo "🔍 Service Status:"
echo "Direct Media Service: $BASE_URL"
echo "Through API Gateway: $API_URL"
echo ""
echo -e "${YELLOW}Note:${NC} Upload endpoints require authentication and will return 401 without a valid JWT token."
echo -e "${YELLOW}Note:${NC} To test file uploads, you'll need to authenticate through the main app first."