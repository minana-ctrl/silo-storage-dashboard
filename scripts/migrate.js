#!/usr/bin/env node

/**
 * Database Migration Script
 * Runs all SQL migrations in order
 * Safe to run multiple times (uses IF NOT EXISTS)
 */

// Load environment variables from .env.local
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔄 Starting database migrations...');
    
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL not set, skipping migrations');
      console.log('   (This is normal for local builds without a database)');
      process.exit(0);
    }
    
    const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && !f.startsWith('.')) // Ignore hidden files (macOS resource forks)
      .sort();
    
    console.log(`📁 Found ${files.length} migration files`);

    for (const file of files) {
      console.log(`\n📝 Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      try {
        await pool.query(sql);
        console.log(`✅ ${file} completed successfully`);
      } catch (error) {
        console.error(`❌ ${file} failed:`, error.message);
        throw error;
      }
    }

    console.log('\n🎉 All migrations completed successfully!');
    
    // Verify tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('vf_sessions', 'vf_transcripts', 'vf_turns', 'vf_events')
      ORDER BY table_name
    `);
    
    console.log('\n📊 Database tables:');
    result.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();

