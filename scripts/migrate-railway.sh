#!/bin/bash

# Railway Database Migration Script
# Run this in your terminal to apply migrations to Railway

echo "🚀 Railway Database Migration"
echo "=============================="
echo ""

# Check if Railway CLI is linked
if ! railway status > /dev/null 2>&1; then
  echo "⚠️  Railway not linked. Linking now..."
  echo ""
  echo "Please run this command in your terminal:"
  echo ""
  echo "  cd \"$(pwd)\" && railway link"
  echo ""
  echo "Then run this script again."
  exit 1
fi

echo "✓ Railway project linked"
echo ""

# Run migrations
echo "📝 Applying migration: 001_create_vf_tables.sql"
railway run node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = fs.readFileSync('db/migrations/001_create_vf_tables.sql', 'utf8');
pool.query(sql)
  .then(() => { console.log('✅ Migration 001 complete'); return pool.end(); })
  .catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
"

echo ""
echo "📝 Applying migration: 002_performance_indexes.sql"
railway run node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = fs.readFileSync('db/migrations/002_performance_indexes.sql', 'utf8');
pool.query(sql)
  .then(() => { console.log('✅ Migration 002 complete'); return pool.end(); })
  .catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
"

echo ""
echo "🎉 Migrations complete!"
echo ""
echo "Verifying tables..."
railway run node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(\\\`
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('vf_sessions', 'vf_transcripts', 'vf_turns', 'vf_events')
  ORDER BY table_name
\\\`)
  .then(result => {
    console.log('📊 Tables in Railway database:');
    result.rows.forEach(row => console.log('  ✓', row.table_name));
    return pool.end();
  })
  .catch(err => { console.error('Error:', err.message); process.exit(1); });
"

echo ""
echo "✅ Done! Your Railway database is ready."

