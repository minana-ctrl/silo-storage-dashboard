#!/usr/bin/env node

/**
 * Run pending database migrations
 * This script runs migrations 006 and 007 on the Railway database
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const migrations = [
  '006_fix_events_deduplication.sql',
  '007_timezone_functional_indexes.sql'
];

async function runMigration(pool, migrationFile) {
  const filePath = path.join(__dirname, '..', 'db', 'migrations', migrationFile);
  
  console.log(`\n📝 Running migration: ${migrationFile}`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }
  
  const sql = fs.readFileSync(filePath, 'utf8');
  
  try {
    await pool.query(sql);
    console.log(`✅ Migration ${migrationFile} completed successfully`);
  } catch (error) {
    console.error(`❌ Migration ${migrationFile} failed:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Running Database Migrations');
  console.log('==============================\n');
  
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  // Mask password in connection string for display
  const maskedUrl = connectionString.replace(/:([^@]+)@/, ':****@');
  console.log(`🔗 Connecting to: ${maskedUrl}\n`);
  
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('railway.app') ? { rejectUnauthorized: false } : undefined
  });
  
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');
    
    // Run each migration
    for (const migration of migrations) {
      await runMigration(pool, migration);
    }
    
    console.log('\n🎉 All migrations completed successfully!');
    console.log('\nWhat these migrations did:');
    console.log('  • Migration 006: Removed duplicate events and added unique constraint');
    console.log('  • Migration 007: Added timezone functional indexes for faster queries\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

