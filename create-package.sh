#!/bin/bash

# Create deployment package for Card Catalog
# This script creates a distributable package that can be installed on other systems

set -e

# Configuration
PACKAGE_NAME="card-catalog-installer"
VERSION="1.0.0"
BUILD_DIR="dist"
PACKAGE_DIR="$BUILD_DIR/$PACKAGE_NAME"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info "Creating deployment package for Card Catalog v$VERSION..."

# Clean previous builds
if [ -d "$BUILD_DIR" ]; then
    rm -rf "$BUILD_DIR"
fi

# Create package directory structure
mkdir -p "$PACKAGE_DIR"

print_info "Copying essential files..."

# Copy source files
cp -r src "$PACKAGE_DIR/"
cp -r public "$PACKAGE_DIR/"

# Copy configuration files
cp package.json "$PACKAGE_DIR/"
cp package-lock.json "$PACKAGE_DIR/"
cp next.config.ts "$PACKAGE_DIR/"
cp tsconfig.json "$PACKAGE_DIR/"
cp tailwind.config.ts "$PACKAGE_DIR/" 2>/dev/null || true
cp postcss.config.mjs "$PACKAGE_DIR/"
cp eslint.config.mjs "$PACKAGE_DIR/"
cp next-env.d.ts "$PACKAGE_DIR/"

# Copy database files
cp create_database.sql "$PACKAGE_DIR/"
cp sample_data.sql "$PACKAGE_DIR/" 2>/dev/null || true

# Copy scripts
cp install.sh "$PACKAGE_DIR/"
cp start.sh "$PACKAGE_DIR/"
cp dev.sh "$PACKAGE_DIR/"
cp start-alt.sh "$PACKAGE_DIR/"
chmod +x "$PACKAGE_DIR"/*.sh

# Copy documentation
cp README.md "$PACKAGE_DIR/" 2>/dev/null || true
cp FILTER_FEATURES.md "$PACKAGE_DIR/" 2>/dev/null || true
cp TECHNICAL_FIXES.md "$PACKAGE_DIR/" 2>/dev/null || true

print_success "Essential files copied"

# Create installation README
cat > "$PACKAGE_DIR/INSTALL.md" << 'EOF'
# Card Catalog Installation Guide

## Quick Start

1. **Extract the package** to your desired location
2. **Navigate to the directory**: `cd card-catalog`
3. **Run the installer**: `./install.sh`
4. **Follow the prompts** for database setup
5. **Start the application**: `./start.sh`

## System Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **SQLite3**: For database operations
- **Operating System**: Linux, macOS, or Windows (with Unix environment)
- **Disk Space**: At least 500MB free space
- **Memory**: 512MB RAM minimum, 1GB recommended

## Installation Options

### Automatic Installation (Recommended)
```bash
./install.sh
```
This will:
- Check system requirements
- Install dependencies
- Initialize the database
- Build the application
- Set up service scripts

### Manual Installation
If the automatic installer doesn't work:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Initialize database**:
   ```bash
   sqlite3 carddb.sqlite < create_database.sql
   sqlite3 carddb.sqlite < sample_data.sql  # Optional sample data
   ```

3. **Build application**:
   ```bash
   npm run build
   ```

4. **Start application**:
   ```bash
   npm start
   ```

## Starting the Application

### Production Mode (Recommended)
```bash
./start.sh
```
- Optimized performance
- Production build
- Runs on port 3000 by default

### Development Mode
```bash
./dev.sh
```
- Hot reloading
- Development features
- Better debugging

### Alternative Port
```bash
./start-alt.sh
```
- Automatically finds available port
- Useful if port 3000 is busy

## Features

- 📊 **Card Reports**: Sort by year+manufacturer or player
- ⚙️ **Data Management**: Full CRUD for players, teams, manufacturers
- 🧮 **Statistics**: Collection summaries and breakdowns
- 🔍 **Advanced Filtering**: Search and filter by multiple criteria
- 📱 **Responsive Design**: Works on desktop and mobile

## Troubleshooting

### Port Already in Use
- Use `./start-alt.sh` to automatically find an available port
- Or manually specify: `PORT=3001 npm start`

### Database Issues
- Ensure SQLite3 is installed: `sqlite3 --version`
- Recreate database: `rm carddb.sqlite && sqlite3 carddb.sqlite < create_database.sql`

### Permission Issues
- Make scripts executable: `chmod +x *.sh`
- Check file permissions: `ls -la`

### Node.js Issues
- Update Node.js: Visit https://nodejs.org/
- Clear npm cache: `npm cache clean --force`
- Delete node_modules: `rm -rf node_modules && npm install`

## File Structure

```
card-catalog/
├── install.sh              # Main installer
├── start.sh                # Production starter
├── dev.sh                  # Development starter
├── package.json            # Dependencies
├── src/                    # Source code
├── public/                 # Static assets
├── create_database.sql     # Database schema
├── sample_data.sql         # Sample data (optional)
└── INSTALL.md             # This file
```

## Support

For issues or questions:
1. Check this installation guide
2. Review TECHNICAL_FIXES.md for known issues
3. Check FILTER_FEATURES.md for feature usage
4. Ensure system requirements are met

## Version Information

- **Version**: 1.0.0
- **Node.js**: Built with Next.js 15.4.3
- **Database**: SQLite 3
- **UI Framework**: React with Tailwind CSS
EOF

print_success "Installation guide created"

# Create version info file
cat > "$PACKAGE_DIR/VERSION" << EOF
Card Catalog v$VERSION
Build Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Node.js Version: $(node --version)
npm Version: $(npm --version)
Platform: $(uname -s)
Architecture: $(uname -m)
EOF

print_success "Version info created"

# Create a simple package info script
cat > "$PACKAGE_DIR/package-info.sh" << 'EOF'
#!/bin/bash

# Display package information

echo "================================"
echo "    Card Catalog Package Info"
echo "================================"
echo ""

if [ -f "VERSION" ]; then
    cat VERSION
    echo ""
fi

echo "Package Contents:"
echo "├── Source code and assets"
echo "├── Database schema and sample data"
echo "├── Installation and startup scripts"
echo "├── Documentation and guides"
echo "└── Configuration files"
echo ""

echo "Installation:"
echo "1. Run: ./install.sh"
echo "2. Follow the prompts"
echo "3. Start with: ./start.sh"
echo ""

echo "System Requirements:"
echo "• Node.js v18.0.0+"
echo "• npm v9.0.0+"
echo "• SQLite3"
echo "• 500MB disk space"
echo ""
EOF

chmod +x "$PACKAGE_DIR/package-info.sh"

print_success "Package info script created"

# Create the final archive
print_info "Creating distributable archive..."

cd "$BUILD_DIR"

# Create tar.gz archive
tar -czf "$PACKAGE_NAME-v$VERSION.tar.gz" "$PACKAGE_NAME"
print_success "Created: $PACKAGE_NAME-v$VERSION.tar.gz"

# Create zip archive for Windows users
if command -v zip >/dev/null 2>&1; then
    zip -r "$PACKAGE_NAME-v$VERSION.zip" "$PACKAGE_NAME" >/dev/null
    print_success "Created: $PACKAGE_NAME-v$VERSION.zip"
else
    print_warning "zip command not found - .zip archive not created"
fi

cd ..

# Display package info
echo ""
echo -e "${GREEN}🎉 Deployment package created successfully!${NC}"
echo ""
echo -e "${BLUE}Package Location:${NC}"
echo "  📁 $BUILD_DIR/"
echo "  📦 $PACKAGE_NAME-v$VERSION.tar.gz"
if [ -f "$BUILD_DIR/$PACKAGE_NAME-v$VERSION.zip" ]; then
    echo "  📦 $PACKAGE_NAME-v$VERSION.zip"
fi
echo ""

# Calculate package size
if command -v du >/dev/null 2>&1; then
    PACKAGE_SIZE=$(du -sh "$BUILD_DIR/$PACKAGE_NAME-v$VERSION.tar.gz" | cut -f1)
    echo -e "${BLUE}Package Size:${NC} $PACKAGE_SIZE"
    echo ""
fi

echo -e "${BLUE}Installation Instructions for Recipients:${NC}"
echo "1. Extract the archive: tar -xzf $PACKAGE_NAME-v$VERSION.tar.gz"
echo "2. Navigate to directory: cd $PACKAGE_NAME"
echo "3. Run installer: ./install.sh"
echo "4. Start application: ./start.sh"
echo ""

echo -e "${BLUE}What's Included:${NC}"
echo "✓ Complete source code"
echo "✓ Database schema and sample data"
echo "✓ Automatic installer with requirements checking"
echo "✓ Startup scripts for different environments"
echo "✓ Comprehensive documentation"
echo "✓ All configuration files"
echo ""

print_success "Package ready for distribution!"