/**
 * Script to seed additional admin users
 * Run with: node scripts/seed-additional-admins.js
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

// Admin accounts to create
const ADMIN_ACCOUNTS = [
  {
    email: 'conor@strategynorth.io',
    password: 'StrategyNorth2024!',
    name: 'Conor',
  },
  {
    email: 'michael@silostorage.com.au',
    password: 'SiloStorage2024!',
    name: 'Michael',
  }
];

async function seedAdmins() {
  const client = await pool.connect();
  const createdAccounts = [];

  try {
    for (const account of ADMIN_ACCOUNTS) {
      await client.query('BEGIN');

      try {
        // Check if user already exists
        const existingUser = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [account.email]
        );

        if (existingUser.rows.length > 0) {
          console.log(`⚠️  User already exists: ${account.email} (skipping)`);
          await client.query('ROLLBACK');
          continue;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(account.password, 12);

        // Create admin user
        const result = await client.query(
          'INSERT INTO users (email, password_hash, name, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role',
          [account.email, passwordHash, account.name, 'admin', true]
        );

        await client.query('COMMIT');

        createdAccounts.push({
          email: account.email,
          password: account.password,
          name: account.name,
        });

        console.log(`✓ Admin user created: ${account.email}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error creating user ${account.email}:`, error.message);
      }
    }

    // Print summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Admin Account Creation Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (createdAccounts.length > 0) {
      console.log(`✓ Successfully created ${createdAccounts.length} admin account(s):\n`);
      
      createdAccounts.forEach((account, index) => {
        console.log(`${index + 1}. ${account.name}`);
        console.log(`   Email:    ${account.email}`);
        console.log(`   Password: ${account.password}`);
        console.log('');
      });

      console.log('⚠️  Important: Save these credentials securely!');
      console.log('⚠️  Users should change their passwords after first login.\n');
    } else {
      console.log('ℹ️  No new accounts created (all users already exist)\n');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedAdmins();

