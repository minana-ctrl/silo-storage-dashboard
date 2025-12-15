/**
 * Script to seed initial admin user
 * Run with: node scripts/seed-admin.js
 */

// Load environment variables from .env.local
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

const DEFAULT_ADMIN_EMAIL = 'admin@silostorage.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin123!';
const DEFAULT_ADMIN_NAME = 'Administrator';

async function seedAdmin() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if admin user already exists
    const existingAdmin = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [DEFAULT_ADMIN_EMAIL]
    );

    if (existingAdmin.rows.length > 0) {
      console.log(`Admin user already exists: ${DEFAULT_ADMIN_EMAIL}`);
      await client.query('ROLLBACK');
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);

    // Create admin user
    const result = await client.query(
      'INSERT INTO users (email, password_hash, name, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role',
      [DEFAULT_ADMIN_EMAIL, passwordHash, DEFAULT_ADMIN_NAME, 'admin', true]
    );

    await client.query('COMMIT');

    console.log('✓ Admin user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log(`  Email:    ${DEFAULT_ADMIN_EMAIL}`);
    console.log(`  Password: ${DEFAULT_ADMIN_PASSWORD}`);
    console.log('');
    console.log('⚠️  Important: Change this password after first login!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding admin user:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedAdmin();

