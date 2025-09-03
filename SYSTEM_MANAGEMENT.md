# System Management Guide

The Card Catalog application includes a comprehensive system management tool for maintaining your installation.

## Quick Start

Run the system manager:
```bash
./system-manager.sh
```

## Features

### 🗂️ **System Information**
- View current version and install date
- Check database and image storage status  
- Monitor server status (running/stopped)
- Display storage usage statistics

### 💾 **Backup Management**
- **Database Backup**: Creates timestamped SQLite database backups
- **Image Backup**: Archives all uploaded card images
- **Full System Backup**: Complete application backup (excludes node_modules)
- **List Backups**: View all existing backups with sizes and dates

### 🔄 **Version Management**
- **Check for Updates**: Compares current version with latest GitHub release
- **Automatic Upgrade**: Option to run upgrade process directly
- **Version History**: Track install and upgrade dates

## Menu Options

| Option | Function | Description |
|--------|----------|-------------|
| 1 | Backup Database | Creates timestamped database backup |
| 2 | Backup Images | Archives all uploaded images |
| 3 | Full System Backup | Complete application backup |
| 4 | List Existing Backups | Shows all backup files with details |
| 5 | Check for Updates | Checks GitHub for newer versions |
| 6 | System Information | Displays detailed system status |
| 0 | Exit | Close system manager |

## Backup Files

All backups are stored in the `backups/` directory with timestamped filenames:

- **Database**: `carddb-backup-YYYYMMDD_HHMMSS.sqlite`
- **Images**: `images-backup-YYYYMMDD_HHMMSS.tar.gz`
- **System**: `system-backup-YYYYMMDD_HHMMSS.tar.gz`

## Best Practices

### Before Upgrades
1. Run system manager: `./system-manager.sh`
2. Create full system backup (option 3)
3. Verify backup was created successfully
4. Then run upgrade: `./upgrade.sh`

### Regular Maintenance
- Weekly database backups for active systems
- Image backups before major changes
- Check for updates monthly
- Monitor system information for storage usage

### Backup Retention
- Keep at least 3 recent database backups
- Archive older backups to external storage
- Test backup restoration periodically

## Version Checking

The system manager checks for updates by:
1. Querying GitHub API for latest release
2. Comparing with current package.json version
3. Offering direct upgrade option if newer version found

## Troubleshooting

### "curl is required" Error
Install curl:
- **Ubuntu/Debian**: `sudo apt-get install curl`
- **CentOS/RHEL**: `sudo yum install curl`
- **macOS**: `brew install curl` (if not already installed)

### "No backups found" Message
- Backups directory will be created automatically
- First backup will initialize the directory

### Version Check Fails
- Check internet connection
- Verify GitHub repository access
- Check firewall settings

## Integration

The system manager integrates with:
- **Install Script**: References system info
- **Upgrade Script**: Suggests backup creation
- **Main Application**: Shares configuration files

## Security Notes

- Backups contain sensitive data (user accounts, card data)
- Store backups securely
- Regularly clean old backup files
- Don't commit backups to version control

## Support

For issues with the system manager:
1. Check file permissions: `ls -la system-manager.sh`
2. Ensure script is executable: `chmod +x system-manager.sh`
3. Run from card-catalog directory
4. Check server logs if integration issues occur