#!/bin/bash

# Test script for Railway cron job endpoint
# This helps verify your cron job setup before deploying

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Cron Job Endpoint${NC}"
echo "================================"
echo ""

# Check if CRON_SECRET is set
if [ -z "$CRON_SECRET" ]; then
    echo -e "${RED}❌ CRON_SECRET environment variable is not set${NC}"
    echo ""
    echo "Please set it:"
    echo "  export CRON_SECRET='your-secret-here'"
    echo ""
    echo "Or add it to your .env.local file:"
    echo "  CRON_SECRET=your-secret-here"
    exit 1
fi

# Check if RAILWAY_PUBLIC_DOMAIN is set, otherwise use localhost
if [ -z "$RAILWAY_PUBLIC_DOMAIN" ]; then
    echo -e "${YELLOW}⚠️  RAILWAY_PUBLIC_DOMAIN not set, using localhost:3000${NC}"
    DOMAIN="http://localhost:3000"
else
    DOMAIN="https://$RAILWAY_PUBLIC_DOMAIN"
fi

echo -e "${GREEN}✓ CRON_SECRET is set${NC}"
echo -e "Domain: ${DOMAIN}"
echo ""

# Test the endpoint
echo "Testing POST /api/sync-transcripts..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$DOMAIN/api/sync-transcripts" \
    -H "Authorization: Bearer $CRON_SECRET" \
    -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Success! Cron endpoint is working correctly${NC}"
    
    # Parse response if jq is available
    if command -v jq &> /dev/null; then
        SYNCED=$(echo "$BODY" | jq -r '.synced // 0')
        FAILED=$(echo "$BODY" | jq -r '.failed // 0')
        SUCCESS=$(echo "$BODY" | jq -r '.success // false')
        
        echo ""
        echo "Sync Results:"
        echo "  - Synced: $SYNCED"
        echo "  - Failed: $FAILED"
        echo "  - Success: $SUCCESS"
    fi
    exit 0
elif [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${RED}❌ Unauthorized - CRON_SECRET doesn't match${NC}"
    echo ""
    echo "Make sure:"
    echo "  1. CRON_SECRET in your environment matches Railway Variables"
    echo "  2. The cron command uses \$CRON_SECRET (not hardcoded)"
    exit 1
elif [ "$HTTP_CODE" -eq 403 ]; then
    echo -e "${YELLOW}⚠️  Forbidden - This might be the GET endpoint in production${NC}"
    echo "The POST endpoint should work with CRON_SECRET"
    exit 1
else
    echo -e "${RED}❌ Error: HTTP $HTTP_CODE${NC}"
    exit 1
fi

