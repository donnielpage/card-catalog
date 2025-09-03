# CardVault Microservices Architecture

## Phase I: Media Service Extraction

This directory contains the first microservice extracted from the CardVault monolith - the **Media Service**.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Gateway   │    │   Main App       │    │  Media Service  │
│   (nginx)       │────│   (Next.js)      │    │   (Express)     │
│   Port 8080     │    │   Port 3000      │    │   Port 3001     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
    ┌─────────┐              ┌─────────┐              ┌─────────┐
    │ Postgres│              │  Redis  │              │ Uploads │
    │Port 5432│              │Port 6379│              │ Volume  │
    └─────────┘              └─────────┘              └─────────┘
```

## Services

### 1. Media Service (Port 3001)
**Extracted functionality:**
- File uploads (`/api/upload`)
- Mobile QR code uploads (`/api/mobile-upload`)  
- Image serving (`/uploads/*`)
- Health checks (`/health`)

### 2. API Gateway (Port 8080)
**Routes traffic to:**
- `/api/upload/*` → Media Service
- `/api/mobile-upload/*` → Media Service  
- `/uploads/*` → Media Service
- All other routes → Main App

### 3. Main App (Port 3000)
**Remaining functionality:**
- Authentication & user management
- Card catalog operations
- Teams, players, manufacturers
- System management
- UI components

## Quick Start

### 1. Start all services:
```bash
./start-microservices.sh
```

### 2. Test the setup:
```bash
./test-media-service.sh
```

### 3. Access the applications:
- **Main App**: http://localhost:3000
- **API Gateway**: http://localhost:8080  
- **Media Service**: http://localhost:3001
- **Direct Database**: localhost:5432

## Development Workflow

### Running in development mode:

```bash
# Start infrastructure (postgres, redis)
docker-compose up -d postgres redis

# Run media service locally
cd media-service
npm install
npm run dev

# Run main app locally  
cd card-catalog
npm run dev

# Or use Docker Compose for everything
docker-compose up --build
```

### Monitoring:

```bash
# Start with monitoring stack
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Access monitoring
open http://localhost:9090  # Prometheus
open http://localhost:3100  # Grafana (admin/admin)
```

## File Structure

```
carddb/
├── card-catalog/          # Main Next.js application
├── media-service/         # New Express microservice
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth & validation  
│   │   ├── utils/         # File handling, sessions
│   │   └── types/         # TypeScript definitions
│   ├── uploads/           # File storage
│   └── Dockerfile
├── monitoring/            # Prometheus & Grafana config
├── docker-compose.yml     # Multi-service setup
├── nginx.conf            # API Gateway config
└── start-microservices.sh # Startup script
```

## Configuration

### Media Service Environment Variables:
```bash
PORT=3001
NODE_ENV=development
NEXTAUTH_SECRET=your-secret-key-here
CORS_ORIGIN=http://localhost:3000
BASE_URL=http://localhost:3001
MAX_FILE_SIZE=5242880
```

### Main App Changes Required:
- Update image upload components to use API Gateway URL
- Modify authentication to include service-to-service tokens
- Update CORS settings to allow media service

## Next Steps (Phase II)

1. **Reference Data Service**: Extract players, teams, manufacturers
2. **User Management Service**: Extract auth and user operations  
3. **Tenant Service**: Extract multi-tenant functionality
4. **System Service**: Extract backup and monitoring

## Rollback Plan

To revert to monolith:
1. Stop microservices: `docker-compose down`
2. Restore original upload routes in main app
3. Copy uploaded files back to main app's public/uploads
4. Remove media service configuration

## Testing

### Manual Testing:
1. **Upload via main app**: Should work through API gateway
2. **Mobile QR upload**: Generate QR, scan, upload via mobile
3. **File serving**: Images should load from `/uploads/*`
4. **Health checks**: All services report healthy status

### Automated Testing:
```bash
# Test endpoints
./test-media-service.sh

# Load testing (future)
npm run test:load

# Integration testing (future)  
npm run test:integration
```

## Troubleshooting

### Common Issues:

1. **CORS errors**: Check `CORS_ORIGIN` in media service
2. **File uploads failing**: Verify nginx `client_max_body_size`
3. **Authentication errors**: Ensure `NEXTAUTH_SECRET` matches across services
4. **Port conflicts**: Check if ports 3000, 3001, 8080 are available

### Debug Commands:
```bash
# Check service logs
docker-compose logs media-service
docker-compose logs api-gateway

# Test direct service connectivity  
curl http://localhost:3001/health
curl http://localhost:8080/health

# Inspect volumes
docker volume ls
docker volume inspect carddb_media-uploads
```

## Security Considerations

- JWT tokens shared between services
- File upload size limits enforced  
- CORS properly configured
- Rate limiting in nginx
- File type validation
- Directory traversal protection

---

**Status**: ✅ Phase I Complete - Media Service Extracted
**Next**: Phase II - Reference Data Service Extraction