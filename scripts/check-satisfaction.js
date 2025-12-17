#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSatisfaction() {
  const client = await pool.connect();
  try {
    // Check if we have any ratings in the database
    const ratings = await client.query(`
      SELECT 
        rating,
        COUNT(*) as count,
        feedback
      FROM vf_sessions
      WHERE rating IS NOT NULL
      GROUP BY rating, feedback
      ORDER BY rating DESC
    `);
    
    console.log('═══════════════════════════════════════════════');
    console.log('RATINGS IN DATABASE');
    console.log('═══════════════════════════════════════════════');
    console.log('Total sessions with ratings:', ratings.rowCount);
    console.log('');
    
    if (ratings.rowCount === 0) {
      console.log('❌ NO RATINGS FOUND!');
      console.log('');
      console.log('This means:');
      console.log('- Transcripts have no rating property set in Voiceflow');
      console.log('- Or rating extraction is failing during ingestion');
      console.log('');
    } else {
      ratings.rows.forEach(r => {
        console.log(`Rating ${r.rating}/5: ${r.count} sessions`);
        if (r.feedback) {
          console.log(`  Feedback: "${r.feedback.substring(0, 50)}..."`);
        }
      });
    }
    
    // Check raw transcripts for rating properties
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('CHECKING RAW TRANSCRIPT PROPERTIES');
    console.log('═══════════════════════════════════════════════');
    
    const sample = await client.query(`
      SELECT 
        session_id,
        raw->'properties' as properties
      FROM vf_transcripts
      LIMIT 5
    `);
    
    sample.rows.forEach((r, i) => {
      console.log(`\nTranscript ${i+1} (${r.session_id.substring(0, 12)}...):`);
      const props = r.properties;
      if (Array.isArray(props)) {
        const ratingProp = props.find(p => 
          p.name && (p.name === 'rating' || p.name.includes('rating') || p.name.includes('satisfaction'))
        );
        const feedbackProp = props.find(p => p.name === 'feedback');
        const typeuserProp = props.find(p => p.name === 'typeuser');
        const locationProp = props.find(p => p.name && p.name.includes('location'));
        
        console.log('  Rating:', ratingProp ? `${ratingProp.value}` : '❌ NOT FOUND');
        console.log('  Feedback:', feedbackProp ? `"${feedbackProp.value}"` : '❌ NOT FOUND');
        console.log('  Typeuser:', typeuserProp ? typeuserProp.value : '❌ NOT FOUND');
        console.log('  Location:', locationProp ? `${locationProp.name}=${locationProp.value}` : '❌ NOT FOUND');
        console.log('  All properties:', props.map(p => p.name).join(', '));
      }
    });
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkSatisfaction().catch(console.error);

