#!/bin/bash

echo "=== CardVault Authentication Diagnostics ==="
echo ""

echo "1. Environment Check:"
echo "   Node.js version: $(node --version)"
echo "   npm version: $(npm --version)"
echo "   Platform: $(uname -s)"
echo ""

echo "2. Database Check:"
if [ -f "carddb.sqlite" ]; then
    echo "   ✓ Database exists"
    echo "   Admin users: $(sqlite3 carddb.sqlite "SELECT COUNT(*) FROM users WHERE role='admin';")"
    echo "   Schema check: $(sqlite3 carddb.sqlite "PRAGMA table_info(users);" | grep -c "favorite_")"
else
    echo "   ✗ Database missing"
fi
echo ""

echo "3. Environment Configuration:"
if [ -f ".env.local" ]; then
    echo "   ✓ .env.local exists"
    echo "   NEXTAUTH_SECRET: $(grep NEXTAUTH_SECRET .env.local | cut -d= -f1)"
    if grep -q "NEXTAUTH_URL" .env.local; then
        echo "   NEXTAUTH_URL: $(grep NEXTAUTH_URL .env.local)"
    else
        echo "   NEXTAUTH_URL: not set (auto-detected)"
    fi
else
    echo "   ✗ .env.local missing"
fi
echo ""

echo "4. Network Check:"
echo "   Hostname: $(hostname)"
echo "   IP addresses:"
if command -v ip >/dev/null 2>&1; then
    ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print "     " $2}' | cut -d'/' -f1
elif command -v ifconfig >/dev/null 2>&1; then
    ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print "     " $2}'
else
    echo "     No network detection tools available"
fi
echo ""

echo "5. File Permissions:"
echo "   install.sh: $(ls -l install.sh | awk '{print $1}')"
if [ -f "carddb.sqlite" ]; then
    echo "   carddb.sqlite: $(ls -l carddb.sqlite | awk '{print $1}')"
fi
echo ""

echo "=== Troubleshooting Tips ==="
echo "If authentication fails on this machine:"
echo "1. Try setting explicit NEXTAUTH_URL in .env.local:"
if command -v ip >/dev/null 2>&1; then
    IP=$(ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K\S+' || echo "YOUR_IP")
    echo "   echo 'NEXTAUTH_URL=http://${IP}:3000' >> .env.local"
else
    echo "   echo 'NEXTAUTH_URL=http://YOUR_SERVER_IP:3000' >> .env.local"
fi
echo ""
echo "2. Check firewall allows port 3000:"
echo "   On macOS: System Preferences > Security & Privacy > Firewall"
echo "   On Linux: sudo ufw allow 3000"
echo ""
echo "3. Use machine's IP instead of localhost:"
echo "   http://[your-machine-ip]:3000"
echo ""