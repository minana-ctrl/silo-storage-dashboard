#!/usr/bin/env node

/**
 * Application Startup Script
 * Runs database migrations before starting the Next.js server
 * This ensures migrations run at runtime when the database is available
 */

const { spawn } = require('child_process');
const path = require('path');

async function start() {
  console.log('🚀 Starting application...\n');

  // Run migrations first
  console.log('📦 Running database migrations...');
  const migrateScript = path.join(__dirname, 'migrate.js');
  const migrateProcess = spawn('node', [migrateScript], {
    stdio: 'inherit',
    env: process.env,
  });

  await new Promise((resolve, reject) => {
    migrateProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Migrations completed successfully\n');
        resolve();
      } else {
        console.error('\n❌ Migrations failed');
        // Don't exit - allow the app to start anyway in case migrations already ran
        // This prevents deployment failures if migrations were already applied
        console.log('⚠️  Continuing startup (migrations may have already been applied)...\n');
        resolve();
      }
    });

    migrateProcess.on('error', (error) => {
      console.error('❌ Failed to run migrations:', error.message);
      console.log('⚠️  Continuing startup (migrations may have already been applied)...\n');
      resolve(); // Continue anyway
    });
  });

  // Start Next.js server
  console.log('🌐 Starting Next.js server...\n');
  const nextProcess = spawn('npm', ['run', 'start:next'], {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });

  nextProcess.on('close', (code) => {
    process.exit(code || 0);
  });

  nextProcess.on('error', (error) => {
    console.error('❌ Failed to start Next.js server:', error);
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    nextProcess.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    nextProcess.kill('SIGINT');
  });
}

start().catch((error) => {
  console.error('💥 Startup failed:', error);
  process.exit(1);
});

