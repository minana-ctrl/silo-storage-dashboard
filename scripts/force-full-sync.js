#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const http = require('http');

async function triggerSync() {
  console.log('🔄 Starting force full re-sync from Voiceflow...\n');
  
  // Use JWT_SECRET as CRON_SECRET if CRON_SECRET isn't set
  const cronSecret = process.env.CRON_SECRET || process.env.JWT_SECRET;
  
  if (!cronSecret) {
    console.error('❌ No CRON_SECRET or JWT_SECRET found in environment');
    process.exit(1);
  }
  
  const data = JSON.stringify({ force: true });
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/sync-transcripts',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Authorization': `Bearer ${cronSecret}`,
    },
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const result = JSON.parse(body);
            console.log('✅ Sync complete!');
            console.log(`  Synced: ${result.synced} transcripts`);
            console.log(`  Failed: ${result.failed} transcripts`);
            
            if (result.errors && result.errors.length > 0) {
              console.log('\n⚠️  Errors:');
              result.errors.slice(0, 5).forEach((error, i) => {
                console.log(`  ${i + 1}. ${error}`);
              });
              if (result.errors.length > 5) {
                console.log(`  ... and ${result.errors.length - 5} more`);
              }
            }
            
            resolve(result);
          } catch (e) {
            console.log('Response:', body);
            resolve({ success: true });
          }
        } else {
          console.log(`❌ Sync failed with status ${res.statusCode}`);
          console.log('Response:', body);
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

triggerSync()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
