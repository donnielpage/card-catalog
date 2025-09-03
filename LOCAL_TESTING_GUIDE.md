# Local Testing Guide for CardVault

## Current Status
✅ **Card Service** - Running on http://localhost:3006  
✅ **Reference Service** - Running on http://localhost:3002  
🚀 **Main App** - Starting on http://localhost:3000

## Quick Test Commands

### 1. Test Service Health
```bash
# Card Service (Phase VI - NEW!)
curl http://localhost:3006/health

# Reference Service  
curl http://localhost:3002/health

# User Service (Docker)
curl http://localhost:3003/health

# System Service (Docker)
curl http://localhost:3004/health

# Tenant Service (Docker)
curl http://localhost:3005/health
```

### 2. Test API Endpoints
```bash
# Reference data (no auth required)
curl http://localhost:3002/api/players
curl http://localhost:3002/api/teams  
curl http://localhost:3002/api/manufacturers

# Card operations (require authentication)
curl http://localhost:3006/cards
# Returns 401 - authentication required (expected)
```

## Web Application Testing

### Access the Application
1. **Main App**: http://localhost:3000
2. **Create Account**: Register a new user
3. **Test Card Management**: Add/edit/view cards through the interface

### Features to Test
- ✅ User registration and login
- ✅ Card CRUD operations  
- ✅ Reference data (players, teams, manufacturers)
- ✅ Multi-tenant functionality
- ✅ Search and filtering
- ✅ Card statistics dashboard

## Architecture Overview

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Browser    │    │  Next.js    │    │   Docker    │
│             │    │  Main App   │    │  Services   │
│localhost:3000│   │  :3000      │    │  :3003-3005 │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │            ┌─────────────┐     ┌─────────────┐
       │            │Card Service │     │Reference Svc│
       │            │   :3006     │     │    :3002    │
       │            └─────────────┘     └─────────────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                      Local Services
```

## Testing Scenarios

### 1. Basic Functionality
- [ ] Open http://localhost:3000
- [ ] Register new user account
- [ ] Login with credentials
- [ ] Navigate to card management
- [ ] Add a new card
- [ ] View card details
- [ ] Search for cards

### 2. Microservices Integration  
- [ ] Verify services are running independently
- [ ] Test health endpoints
- [ ] Confirm data persistence
- [ ] Test cross-service communication

### 3. Phase VI Card Service
- [ ] Test new Card Service endpoints
- [ ] Verify multi-tenant functionality  
- [ ] Test card statistics
- [ ] Confirm database integration

## Troubleshooting

### Services Not Starting
```bash
# Check what's running on each port
lsof -i :3000  # Main app
lsof -i :3002  # Reference service
lsof -i :3006  # Card service

# Kill processes if needed
pkill -f "npm run dev"
```

### Database Issues
```bash
# Check Docker PostgreSQL
docker ps | grep postgres

# Check SQLite files
ls -la /Users/donniepage/development/carddb/card-service/data/
```

### Browser Issues
- Clear browser cache and cookies
- Try incognito/private browsing
- Check browser console for errors

## Expected Results

### ✅ Success Indicators
- All health endpoints return 200 status
- Main application loads without errors
- User can register and login
- Card operations work through the UI
- Services run independently
- Database operations succeed

### 🚀 Phase VI Achievements  
- Card Service responds on port 3006
- Complete microservices architecture
- Independent service deployment
- Multi-tenant card management
- Cross-service validation working

## Next Steps After Testing
1. **Production Deployment** - Configure for production environment
2. **Performance Testing** - Load testing and optimization  
3. **Security Review** - Authentication and authorization audit
4. **Monitoring Setup** - Logging and metrics implementation
5. **Documentation** - API documentation and user guides

---

**The CardVault microservices transformation is complete and ready for testing!** 🎉