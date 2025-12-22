#!/bin/bash

# Database Migration Runner
# This script runs pending database migrations on your Railway PostgreSQL database

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Database Migration Runner${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if DATABASE_URL is provided
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL environment variable not set${NC}"
    echo ""
    echo "To get your DATABASE_URL:"
    echo "  1. Go to https://railway.app/"
    echo "  2. Select your project"
    echo "  3. Click on PostgreSQL service"
    echo "  4. Go to 'Connect' tab"
    echo "  5. Copy the 'Database URL'"
    echo ""
    echo "Then run this script with:"
    echo -e "${GREEN}  DATABASE_URL=\"your-database-url\" ./scripts/run-migrations.sh${NC}"
    echo ""
    exit 1
fi

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ Error: psql is not installed${NC}"
    echo ""
    echo "Install PostgreSQL client:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql-client"
    echo ""
    exit 1
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "📂 Project directory: ${PROJECT_DIR}"
echo ""

# Migrations to run
MIGRATIONS=(
    "006_fix_events_deduplication.sql"
    "007_timezone_functional_indexes.sql"
)

# Run each migration
for migration in "${MIGRATIONS[@]}"; do
    migration_file="$PROJECT_DIR/db/migrations/$migration"
    
    if [ ! -f "$migration_file" ]; then
        echo -e "${RED}❌ Migration file not found: $migration${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}🔄 Running migration: $migration${NC}"
    
    if psql "$DATABASE_URL" -f "$migration_file"; then
        echo -e "${GREEN}✅ Migration completed: $migration${NC}"
    else
        echo -e "${RED}❌ Migration failed: $migration${NC}"
        exit 1
    fi
    
    echo ""
done

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ All migrations completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo "  • Verify your application is working correctly"
echo "  • Check analytics queries are faster"
echo "  • Monitor for any duplicate event issues"
echo ""

