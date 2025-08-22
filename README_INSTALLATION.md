# CardVault Installation Guide (Legacy SQLite)

> **⚠️ This guide is for legacy SQLite installations. For new installations, see [INSTALLATION.md](./INSTALLATION.md) for the recommended PostgreSQL multi-tenant setup.**
> 
> **🔄 Existing users**: See [UPGRADE_GUIDE.md](./UPGRADE_GUIDE.md) to migrate from SQLite to PostgreSQL.

## Fresh Installation

To set up a new CardVault database with all 30 MLB teams and their official colors:

1. **Create the database schema:**
   ```bash
   sqlite3 carddb.sqlite < create_database.sql
   ```

2. **Populate with sample data (including all MLB teams):**
   ```bash
   sqlite3 carddb.sqlite < sample_data.sql
   ```

3. **Add initial users:**
   ```bash
   sqlite3 carddb.sqlite "INSERT INTO users (username, email, firstname, lastname, password_hash, role) VALUES ('admin', 'admin@cardvault.com', 'Admin', 'User', '\$2b\$12\$lObinT/d5hSSaiiiRDMSt.my82WpG8fE7BT22dUjNHeIY3H6LraCi', 'admin');"
   ```

   Default admin credentials:
   - Username: `admin`
   - Password: `password123`

## What's Included

### Complete MLB Teams (30 teams)
- All National League and American League teams
- Official team colors (primary, secondary, accent)
- Organized by division

### Sample Data
- 4 manufacturers (Topps, Upper Deck, Panini, Bowman)
- 5 legendary players (Jeter, Williams, Ruth, Mantle, Mays)
- 5 sample cards with proper team/player associations

### Features
- Team-colored user avatars based on favorites
- Automatic favorite filtering on Cards page
- Toggle to enable/disable favorite filters
- Full CRUD operations for cards, teams, players, manufacturers

## Team Colors

Teams include official color palettes from multiple sources:
- **Primary Color**: Main team color (used for user avatars)
- **Secondary Color**: Accent/border color  
- **Accent Color**: Additional team color

Examples:
- Boston Red Sox: Red (#bd3039), Navy (#192c55), White (#FFFFFF)
- New York Yankees: Navy (#0c2340), White (#ffffff), Gray (#c4ced4)
- Los Angeles Dodgers: Dodger Blue (#005a9c), Gray (#c4ced4), Red (#ef3e42)

## Troubleshooting

If teams aren't populating properly:
1. Check that `create_database.sql` includes color columns
2. Ensure `sample_data.sql` uses individual INSERT statements
3. Verify database file permissions

For SQLite compatibility, all INSERT statements use individual commands rather than multi-value inserts.