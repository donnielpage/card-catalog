#!/bin/bash

# Card Catalog Port Cleanup Script
# This script helps clean up ports and restart the development server

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧹 Card Catalog Port Cleanup${NC}"
echo ""

# Function to kill processes on port 3000
kill_port_3000() {
    echo -e "${YELLOW}Checking for processes on port 3000...${NC}"
    PIDS=$(lsof -ti:3000 2>/dev/null)
    
    if [ -z "$PIDS" ]; then
        echo -e "${GREEN}✓ Port 3000 is already free${NC}"
    else
        echo -e "${YELLOW}Found processes on port 3000: $PIDS${NC}"
        kill -9 $PIDS 2>/dev/null
        echo -e "${GREEN}✓ Killed processes on port 3000${NC}"
    fi
}

# Function to kill all Next.js processes
kill_all_next() {
    echo -e "${YELLOW}Killing all Next.js processes...${NC}"
    pkill -f "next" 2>/dev/null && echo -e "${GREEN}✓ Killed all Next.js processes${NC}" || echo -e "${GREEN}✓ No Next.js processes found${NC}"
}

# Function to kill Node processes that might be holding ports
kill_node_processes() {
    echo -e "${YELLOW}Checking for Node.js processes on common ports...${NC}"
    
    for port in 3000 3001 3002 3003 3004 3005 3006 3007; do
        PIDS=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$PIDS" ]; then
            echo -e "${YELLOW}Killing processes on port $port: $PIDS${NC}"
            kill -9 $PIDS 2>/dev/null
        fi
    done
    
    echo -e "${GREEN}✓ Port cleanup completed${NC}"
}

# Main menu
echo "Choose an option:"
echo "1) Kill port 3000 only"
echo "2) Kill all Next.js processes"
echo "3) Kill all Node processes on ports 3000-3007"
echo "4) Full cleanup + start dev server"
echo "5) Full cleanup + start production server"
echo "6) Exit"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        kill_port_3000
        ;;
    2)
        kill_all_next
        ;;
    3)
        kill_node_processes
        ;;
    4)
        kill_node_processes
        echo ""
        echo -e "${GREEN}🚀 Starting development server...${NC}"
        npm run dev
        ;;
    5)
        kill_node_processes
        echo ""
        echo -e "${GREEN}🏗️  Building application...${NC}"
        npm run build
        echo -e "${GREEN}🚀 Starting production server...${NC}"
        npm start
        ;;
    6)
        echo -e "${GREEN}👋 Goodbye!${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✨ Done!${NC}"