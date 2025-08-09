# CardVault - Card Collection Management System

A modern web application built with Next.js for managing sports card collections with advanced filtering, team preferences, and comprehensive reporting.

## Features

- 🃏 **Card Management**: Full CRUD operations for your card collection
- 👥 **User Management**: Role-based access control (Admin, Manager, User)
- ⚾ **Team Integration**: All 30 MLB teams with official colors
- ⭐ **Favorites System**: Set favorite teams/players with automatic filtering
- 📊 **Advanced Reporting**: Detailed statistics and breakdowns
- 🖼️ **Image Upload**: Upload and manage card images
- 🔍 **Smart Filtering**: Filter by manufacturer, year, player, team, and more
- 🎨 **Dynamic Theming**: UI adapts to user's favorite team colors

## Quick Start

### Development Server
```bash
./dev.sh
```

### Production Build
```bash
./start.sh
```

The application will be available at:
- **Local**: http://localhost:3000
- **Network**: http://YOUR_IP:3000 (accessible from other devices)

## Network Access

The application is configured to accept connections from other devices on your network. When you start the server, it will display all available access URLs.

### For External Access:
1. Start the server using `./dev.sh` or `./start.sh`
2. Note the network IP address shown in the startup message
3. Other devices can access the application using: `http://YOUR_SERVER_IP:3000`

### Environment Configuration

Copy `.env.example` to `.env.local` and customize:

```bash
cp .env.example .env.local
```

Key configurations:
- `NEXTAUTH_SECRET`: Secure secret for authentication
- `NEXTAUTH_URL`: Set specific URL if needed (auto-detected by default)

## Admin Access

Admin credentials are set during installation. The installer will prompt you to create a secure admin password.

## Database

Uses SQLite database (`carddb.sqlite`) with the following tables:
- Users (with role-based permissions)
- Teams (all 30 MLB teams with official colors)
- Players
- Manufacturers
- Cards (with image support)

## Project Structure

```
├── src/
│   ├── app/                 # Next.js app router pages
│   ├── components/          # React components
│   └── lib/                 # Utilities and database
├── public/uploads/          # Uploaded card images
├── scripts/                 # Database and setup scripts
└── *.sh                     # Start/dev scripts
```

## Key Features Detail

### Team Color Integration
- User profile includes favorite team selection
- CV logo dynamically changes to team colors
- All 30 MLB teams with official primary/secondary/accent colors

### Advanced Filtering
- Filter by manufacturer + year combinations
- Filter by specific players or teams
- Full-text search across all card fields
- Auto-apply user favorites as default filters
- Toggle favorites filtering on/off

### Role-Based Access
- **User**: Can view and add cards
- **Manager**: Can modify existing data
- **Admin**: Full system access including user management

### Image Management
- Upload card images through web interface
- Images stored in `public/uploads/`
- Modal image viewer with full-size display

## Development

Built with:
- Next.js 15.4.3
- React 19.1.0
- TypeScript
- Tailwind CSS
- NextAuth.js
- SQLite3

## License

MIT License