#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const http = require('http');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function clearAllData() {
  const client = await pool.connect();
  try {
    console.log('🗑️  Clearing all existing data...\n');
    
    await client.query('BEGIN');
    
    // Get current counts
    const before = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM vf_sessions) as sessions,
        (SELECT COUNT(*) FROM vf_turns) as turns,
        (SELECT COUNT(*) FROM vf_transcripts) as transcripts,
        (SELECT COUNT(*) FROM vf_events) as events
    `);
    
    console.log('Before cleanup:');
    console.log(`  Sessions: ${before.rows[0].sessions}`);
    console.log(`  Turns: ${before.rows[0].turns}`);
    console.log(`  Transcripts: ${before.rows[0].transcripts}`);
    console.log(`  Events: ${before.rows[0].events}\n`);
    
    // Delete all data (cascades will handle turns)
    await client.query('DELETE FROM vf_events');
    await client.query('DELETE FROM vf_turns');
    await client.query('DELETE FROM vf_sessions');
    await client.query('DELETE FROM vf_transcripts');
    
    await client.query('COMMIT');
    
    console.log('✅ All data cleared\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function triggerFullSync() {
  console.log('🔄 Starting fresh full sync from Voiceflow...\n');
  
  const cronSecret = process.env.CRON_SECRET || process.env.JWT_SECRET;
  const data = JSON.stringify({ force: true });
  
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/sync-transcripts',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
          'Authorization': `Bearer ${cronSecret}`,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            const result = JSON.parse(body);
            console.log('✅ Sync complete!');
            console.log(`  Synced: ${result.synced} transcripts`);
            console.log(`  Failed: ${result.failed} transcripts\n`);
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      }
    );
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function validateResults() {
  const client = await pool.connect();
  try {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const result = await client.query(`
      SELECT 
        COUNT(*) as conversations,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as sessions_with_user
      FROM vf_sessions
      WHERE (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date >= $1::date 
        AND (started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date <= $2::date
    `, [startDate, endDate]);
    
    const msgResult = await client.query(`
      SELECT COUNT(*) as count
      FROM vf_turns
      WHERE (timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date >= $1::date 
        AND (timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date <= $2::date
        AND role IN ('user', 'assistant')
    `, [startDate, endDate]);
    
    console.log('═══════════════════════════════════════════════');
    console.log('VALIDATION (Last 7 Days)');
    console.log('═══════════════════════════════════════════════');
    console.log('📊 Conversations:', result.rows[0].conversations);
    console.log('💬 Messages:', msgResult.rows[0].count);
    console.log('👥 Unique Users:', result.rows[0].unique_users);
    console.log('📋 Sessions with userId:', result.rows[0].sessions_with_user, '/', result.rows[0].conversations);
    console.log('\nTarget (Voiceflow): 30 conversations, 130 messages, 30 users');
    
  } finally {
    client.release();
    await pool.end();
  }
}

async function run() {
  try {
    await clearAllData();
    await triggerFullSync();
    await new Promise(r => setTimeout(r, 2000)); // Wait for sync to complete
    await validateResults();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

run();

