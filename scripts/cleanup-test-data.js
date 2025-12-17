#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function cleanupTestData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🧹 Starting cleanup of test/corrupted data...\n');
    
    // 1. Find sessions with empty or null session_id
    const emptySessionResult = await client.query(`
      SELECT s.session_id, COUNT(t.id) as turn_count
      FROM vf_sessions s
      LEFT JOIN vf_turns t ON s.session_id = t.session_id
      WHERE s.session_id = '' OR s.session_id IS NULL
      GROUP BY s.session_id
    `);
    
    console.log(`Found ${emptySessionResult.rowCount} sessions with empty session_id`);
    
    // 2. Find test user sessions
    const testUserResult = await client.query(`
      SELECT s.session_id, s.user_id
      FROM vf_sessions s
      WHERE s.user_id = 'test-user' OR s.user_id LIKE '%test%'
    `);
    
    console.log(`Found ${testUserResult.rowCount} test user sessions`);
    
    // 3. Find sessions with spam-like text
    const spamResult = await client.query(`
      SELECT DISTINCT t.session_id, COUNT(t.id) as turn_count
      FROM vf_turns t
      WHERE t.text LIKE '%jjj%' 
         OR t.text LIKE '%mmjj%'
         OR t.text LIKE '%NN jjj%'
      GROUP BY t.session_id
      HAVING COUNT(t.id) > 50
    `);
    
    console.log(`Found ${spamResult.rowCount} sessions with spam-like messages (>50 spam turns)`);
    
    // 4. Delete events for corrupted sessions
    console.log('\n🗑️  Deleting events for corrupted sessions...');
    const deletedEvents = await client.query(`
      DELETE FROM vf_events
      WHERE session_id = '' 
         OR session_id IS NULL
         OR session_id IN (SELECT session_id FROM vf_sessions WHERE user_id = 'test-user' OR user_id LIKE '%test%')
         OR session_id IN (
           SELECT DISTINCT session_id
           FROM vf_turns
           WHERE text LIKE '%jjj%' OR text LIKE '%mmjj%' OR text LIKE '%NN jjj%'
           GROUP BY session_id
           HAVING COUNT(id) > 50
         )
    `);
    console.log(`✓ Deleted ${deletedEvents.rowCount} events`);
    
    // 5. Delete turns for corrupted sessions
    console.log('🗑️  Deleting turns for corrupted sessions...');
    const deletedTurns = await client.query(`
      DELETE FROM vf_turns
      WHERE session_id = '' 
         OR session_id IS NULL
         OR session_id IN (SELECT session_id FROM vf_sessions WHERE user_id = 'test-user' OR user_id LIKE '%test%')
         OR (text LIKE '%jjj%' OR text LIKE '%mmjj%' OR text LIKE '%NN jjj%')
    `);
    console.log(`✓ Deleted ${deletedTurns.rowCount} turns`);
    
    // 6. Delete corrupted sessions
    console.log('🗑️  Deleting corrupted sessions...');
    const deletedSessions = await client.query(`
      DELETE FROM vf_sessions
      WHERE session_id = '' 
         OR session_id IS NULL
         OR user_id = 'test-user'
         OR user_id LIKE '%test%'
    `);
    console.log(`✓ Deleted ${deletedSessions.rowCount} sessions`);
    
    // 7. Get updated counts
    const finalCounts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM vf_sessions) as sessions,
        (SELECT COUNT(*) FROM vf_turns) as turns,
        (SELECT COUNT(*) FROM vf_events) as events
    `);
    
    await client.query('COMMIT');
    
    console.log('\n✅ Cleanup complete!');
    console.log('\nDatabase state after cleanup:');
    console.log(`  Sessions: ${finalCounts.rows[0].sessions}`);
    console.log(`  Turns: ${finalCounts.rows[0].turns}`);
    console.log(`  Events: ${finalCounts.rows[0].events}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Cleanup failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupTestData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

