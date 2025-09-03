# Card Catalog - Complete Installation Guide

## 📦 Installation Overview

CardVault is a Next.js application with an automated installation system that includes dependency checking, database setup, and service configuration. Installation is done by cloning the repository and running the install script.

## 🎯 Quick Installation (Recommended)

### Step 1: Clone the Repository
```bash
git clone https://github.com/donnielpage/card-catalog.git
cd card-catalog
```

### Step 2: Run the Installer
```bash
./install.sh
```
The installer will:
- Check system requirements
- Install dependencies
- Set up the database
- Create admin account
- Configure environment

### Step 3: Start the Application
```bash
# Option 1: Development mode (recommended for most users)
npm run dev

# Option 2: Production mode
npm start
```

### Step 4: Access
- Open your browser to: **http://localhost:3000**
- Log in with the admin credentials you created
- Start managing your card collection!

## 🔧 Alternative Installation Methods

### Development Installation
For developers or advanced users who want to customize the application:

```bash
# Clone repository
git clone https://github.com/donnielpage/card-catalog.git
cd card-catalog

# Install dependencies manually
npm install

# Set up environment (copy and customize)
cp .env.example .env.local
# Edit .env.local with your settings

# Initialize database
sqlite3 carddb.sqlite < create_database.sql

# Start in development mode
npm run dev
```

## 🖥️ System Requirements

### Minimum Requirements
- **Operating System**: Linux, macOS, or Windows (with Unix environment)
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **SQLite3**: For database operations
- **Disk Space**: 500MB free space
- **RAM**: 512MB minimum, 1GB recommended

### Recommended Setup
- **Node.js**: Latest LTS version
- **npm**: Latest version
- **Disk Space**: 1GB+ for comfort
- **RAM**: 2GB+ for optimal performance

## 📋 Running Options

### Development Mode (Recommended)
```bash
npm run dev
```
**Best for:**
- Personal use
- Testing and evaluation
- Development work
- Better error reporting
- Hot reloading

### Production Mode
```bash
npm run build
npm start
```
**Best for:**
- Server deployments
- Performance-critical environments
- Multiple concurrent users

### Alternative Port
```bash
./start-alt.sh             # Finds available port automatically
PORT=4000 npm run dev       # Custom port
```

## 🌐 Network Access

### Local Access
After installation, access your application at:
- **http://localhost:3000** (if using default port)
- **http://localhost:3001** (if port 3000 is busy)

### Network Access from Other Devices
To access from other devices on your network:

1. **Find your machine's IP address:**
   ```bash
   # On Linux/macOS
   ip addr show | grep "inet " | grep -v 127.0.0.1
   # or
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. **Set NEXTAUTH_URL in .env.local:**
   ```bash
   echo "NEXTAUTH_URL=http://YOUR-MACHINE-IP:3000" >> .env.local
   ```

3. **Restart the application** and access from other devices at:
   **http://YOUR-MACHINE-IP:3000**

## 🗄️ Database Management

### Database Location
- **File**: `carddb.sqlite` (in application directory)
- **Format**: SQLite 3
- **Size**: Starts ~40KB, grows with data

### Sample Data
The installer optionally includes sample baseball cards:
- 5 sample cards
- Players: Derek Jeter, Ted Williams, Babe Ruth, Mickey Mantle, Willie Mays
- Teams: Yankees, Red Sox, Giants
- Manufacturers: Topps, Upper Deck

### Database Schema
- **cards**: Main card collection
- **players**: Player information
- **teams**: Team information  
- **manufacturers**: Card manufacturer information

## 🔍 Features Overview

### 📊 Card Reports
- Sort by year + manufacturer
- Sort by player name
- Detailed statistics and breakdowns
- Cards by manufacturer & year summary

### ⚙️ Data Management
- **Cards**: Full CRUD operations
- **Players**: Add/edit/delete player information
- **Teams**: Manage team data
- **Manufacturers**: Track card manufacturers

### 🔍 Advanced Filtering
- **General search**: Search across all fields
- **Manufacturer + Year**: Filter by specific combinations
- **Player**: Filter by specific player
- **Team**: Filter by specific team
- **Multiple filters**: Combine filters for precise results

### 📱 User Interface
- **Responsive design**: Works on desktop and mobile
- **Modern UI**: Clean, intuitive interface
- **Real-time updates**: Instant feedback
- **Dark/light themes**: Tailwind CSS styling

## 🛠️ Troubleshooting

### Authentication Issues (Login Problems)

If you can't log in after a fresh install, this is usually related to network configuration:

#### Quick Diagnosis
Run the authentication diagnostic tool:
```bash
./debug-auth.sh
```

#### Common Authentication Solutions

**Problem**: Login form clears and returns to login page
**Solution**: Set explicit NEXTAUTH_URL in `.env.local`
```bash
# Option 1: Auto-detect your IP
echo "NEXTAUTH_URL=http://$(hostname -I | awk '{print $1}' | tr -d ' '):3000" >> .env.local

# Option 2: Manual setup (replace with your machine's IP)
echo "NEXTAUTH_URL=http://192.168.1.100:3000" >> .env.local
```

**Problem**: "Invalid username or password" on fresh install
**Causes & Solutions:**
1. **Database schema mismatch**: Ensure fresh database created
2. **Wrong credentials**: Use exact credentials from install process
3. **Case sensitivity**: Username is case-sensitive

**Problem**: 404 errors on authentication requests (production mode)
**Solution**: Rebuild after updating code
```bash
npm run build
npm start
```

**Problem**: Authentication works in dev mode but not production mode
**Solution**: Use development mode for most users
```bash
npm run dev  # Recommended for personal use
```

**Problem**: Browser shows "Cannot connect" or timeouts
**Solutions:**
1. **Use machine IP instead of localhost**: `http://[your-ip]:3000`
2. **Check firewall**: Ensure port 3000 is accessible
3. **Try different port**: `PORT=3001 npm run dev`

#### Network Access from Other Devices
To access from other devices on your network:
1. **Set NEXTAUTH_URL** to your machine's IP:
   ```bash
   echo "NEXTAUTH_URL=http://$(hostname -I | awk '{print $1}' | tr -d ' '):3000" >> .env.local
   ```
2. **Restart the application** after changing `.env.local`
3. **Access from other devices**: `http://[your-machine-ip]:3000`

### Common Issues

#### Port Already in Use
```bash
# Solution 1: Use alternative port
./start-alt.sh

# Solution 2: Specify custom port
PORT=3001 npm start

# Solution 3: Kill existing process
pkill -f "next"
```

#### Database Issues
```bash
# Recreate database
rm carddb.sqlite
sqlite3 carddb.sqlite < create_database.sql

# Check SQLite installation
sqlite3 --version
```

#### Permission Issues
```bash
# Fix script permissions
chmod +x *.sh

# Check file permissions
ls -la
```

#### Node.js Version Issues
```bash
# Check version
node --version
npm --version

# Update Node.js
# Visit: https://nodejs.org/

# Clear npm cache
npm cache clean --force
```

#### Build Issues
```bash
# Clean and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Getting Help

1. **Check logs**: Application errors appear in terminal
2. **Browser console**: Press F12 for client-side errors
3. **Database**: Use `sqlite3 carddb.sqlite` to inspect data
4. **Requirements**: Ensure all system requirements are met
5. **Documentation**: Check `FILTER_FEATURES.md` and `TECHNICAL_FIXES.md`

## 🗑️ Uninstallation

### Complete Removal
```bash
./uninstall.sh
```

**This will:**
- ✅ Stop all running processes
- ✅ Remove all application files
- ✅ Optionally backup database
- ✅ Clean up completely

**This will NOT remove:**
- Node.js or npm (system installations)
- SQLite3 (system installation)
- Database backups (if created)

## 📁 File Structure

```
card-catalog/
├── 📄 install.sh              # Main installer
├── 📄 start.sh                # Production starter
├── 📄 dev.sh                  # Development starter
├── 📄 start-alt.sh            # Alternative port starter
├── 📄 uninstall.sh            # Complete removal
├── 📄 create-package.sh       # Package creator
├── 📦 package.json            # Dependencies and scripts
├── 📊 carddb.sqlite           # Database file (created during install)
├── 📋 create_database.sql     # Database schema
├── 📋 sample_data.sql         # Sample data (optional)
├── 📁 src/                    # Application source code
├── 📁 public/                 # Static assets
├── 📁 .next/                  # Built application (created during build)
├── 📁 node_modules/           # Dependencies (created during install)
├── 📖 README.md               # Main documentation
├── 📖 INSTALLATION_README.md  # This file
├── 📖 FILTER_FEATURES.md      # Filter usage guide
└── 📖 TECHNICAL_FIXES.md      # Technical documentation
```

## 🔄 Updates and Maintenance

### Updating the Application
1. **Backup database**: `cp carddb.sqlite carddb_backup.sqlite`
2. **Get new version**: Download updated package
3. **Extract and install**: Follow installation steps
4. **Restore data**: Copy back your database if needed

### Regular Maintenance
- **Database backup**: Regularly backup `carddb.sqlite`
- **Update dependencies**: `npm update` (for development)
- **Clean builds**: Occasionally delete `.next` and rebuild

## 📊 Version Information

- **Current Version**: 1.0.0
- **Node.js**: Built with Next.js 15.4.3
- **Database**: SQLite 3
- **UI Framework**: React 18 with Tailwind CSS
- **Compatibility**: Modern browsers (Chrome, Firefox, Safari, Edge)

## 🎉 Success!

Once installed, your Card Catalog application will be running with:

- 📊 **Professional card management system**
- 🔍 **Advanced search and filtering**
- 📈 **Detailed reporting and statistics**
- 📱 **Mobile-friendly interface**
- ⚡ **Fast, responsive performance**

**Access your application at: http://localhost:3000**

Happy collecting! 🃏