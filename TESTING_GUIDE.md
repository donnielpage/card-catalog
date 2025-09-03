# CardVault Microservices Testing Guide

## Quick Start with Docker (Recommended)

### 1. Start Docker Desktop
On macOS, start Docker Desktop application first, then:

```bash
cd /Users/donniepage/development/carddb
docker-compose up -d
```

This starts all services:
- **Main App**: http://localhost:3000 
- **API Gateway**: http://localhost:8080
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 2. Verify Services
```bash
# Check all containers
docker-compose ps

# Check service health
curl http://localhost:8080/health
curl http://localhost:8080/health/card-service
curl http://localhost:8080/health/user-service
curl http://localhost:8080/health/reference-service
```

### 3. Test API Gateway Routing
```bash
# Test card service through gateway
curl http://localhost:8080/api/cards
# (Returns 401 - authentication required, which is expected)

# Test reference service through gateway  
curl http://localhost:8080/api/players
# (Returns data - no auth required for reference data)
```

### 4. Access Web Application
Open http://localhost:3000 in your browser to use the full CardVault application.

---

## Alternative: Individual Service Testing (Without Docker)

If Docker isn't available, you can test services individually:

### Start Services Manually
```bash
# Terminal 1: Reference Service (port 3002)
cd reference-service && npm install && npm run dev

# Terminal 2: User Service (port 3003) 
cd user-service && npm install && npm run dev

# Terminal 3: Card Service (port 3006)
cd card-service && npm run dev

# Terminal 4: Main App (port 3000)
cd card-catalog && npm install && npm run dev
```

### Test Individual Services
```bash
# Reference Service
curl http://localhost:3002/health
curl http://localhost:3002/players

# User Service  
curl http://localhost:3003/health

# Card Service
curl http://localhost:3006/health
```

---

## Complete System Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │    │  Docker     │    │ PostgreSQL  │
│             │    │ Compose     │    │ Database    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │            ┌─────────────────────────────┐
       └────────────│    API Gateway (nginx)     │
                    │         :8080               │
                    └─────────────────────────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Next.js   │    │ Card Service│    │User Service │
│ Main App    │    │    :3006    │    │    :3003    │
│    :3000    │    └─────────────┘    └─────────────┘
└─────────────┘              │                │
       │              ┌─────────────┐  ┌─────────────┐
       │              │Reference Svc│  │Tenant Service│
       │              │    :3002    │  │    :3005    │
       │              └─────────────┘  └─────────────┘
       │                     │               │
┌─────────────┐    ┌─────────────┐  ┌─────────────┐
│Media Service│    │System Service│ │    Redis    │
│    :3001    │    │    :3004    │  │    :6379    │
└─────────────┘    └─────────────┘  └─────────────┘
```

## Service Ports
- **3000**: Main CardVault App (Next.js)
- **3001**: Media Service  
- **3002**: Reference Service
- **3003**: User Service
- **3004**: System Service
- **3005**: Tenant Service
- **3006**: Card Service ⭐ (New in Phase VI)
- **5432**: PostgreSQL Database
- **6379**: Redis Cache
- **8080**: API Gateway (nginx)

## Testing Endpoints

### Health Checks
- `GET /health` - Gateway health
- `GET /health/{service-name}` - Individual service health

### API Routes (via Gateway :8080)
- `GET /api/cards` - Card management
- `GET /api/players` - Player data
- `GET /api/teams` - Team data  
- `GET /api/manufacturers` - Manufacturer data
- `GET /api/users` - User management
- `GET /api/tenants` - Tenant management
- `GET /api/system` - System administration

### Authentication Required
Most endpoints require JWT authentication. Create an account through the web interface first, then use the token in API calls:

```bash
curl -H "Authorization: Bearer <token>" \
     -H "X-Tenant-Id: <tenant-id>" \
     http://localhost:8080/api/cards
```

---

## Troubleshooting

### Docker Issues
- Ensure Docker Desktop is running
- Try `docker-compose down && docker-compose up -d` to restart
- Check logs: `docker-compose logs <service-name>`

### Port Conflicts
- Check if ports 3000-3006, 5432, 6379, 8080 are available
- Stop other applications using these ports

### Database Issues
- PostgreSQL data persists in Docker volume `postgres-data`
- Reset: `docker-compose down -v && docker-compose up -d`

## Success Indicators
✅ All services return healthy status  
✅ API Gateway routes requests correctly  
✅ Web application loads at localhost:3000  
✅ Card operations work through the interface  
✅ Multi-tenant functionality operates correctly