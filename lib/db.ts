import { Pool, PoolClient } from 'pg';
import performanceMonitor from '@/lib/performanceMonitor';

/**
 * Database pool for Postgres connections
 * Uses connection pooling to manage multiple concurrent database requests
 */
let pool: Pool | null = null;

/**
 * Get or create the database pool
 */
function getPool(): Pool {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  pool = new Pool({
    connectionString,
    max: 25, // Increased from 10 to 25 for better concurrent request handling
    min: 5, // Maintain minimum idle connections for faster response times
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, // Reduced from 10s to 5s to fail faster if pool exhausted
    statement_timeout: 30000, // Prevent hanging queries (30 seconds)
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  pool.on('connect', () => {
    // Optional: Log when new connections are established (for debugging)
    // console.log('[DB] New connection established');
  });

  return pool;
}

/**
 * Execute a query with optional parameters and retry logic
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const queryStartTime = Date.now();
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const client = await getPool().connect();
      
      try {
        const result = await client.query(text, params);
        const duration = Date.now() - queryStartTime;
        
        // Track query performance
        performanceMonitor.trackQuery(text, duration, result.rowCount || 0);
        
        return {
          rows: result.rows as T[],
          rowCount: result.rowCount,
        };
      } finally {
        client.release();
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on syntax errors or permission errors
      if (
        lastError.message.includes('syntax error') ||
        lastError.message.includes('permission denied')
      ) {
        throw lastError;
      }

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        const duration = Date.now() - queryStartTime;
        console.error(`[DB] Query failed after ${maxRetries + 1} attempts (${duration}ms):`, lastError.message);
        performanceMonitor.trackQuery(text, duration);
        throw lastError;
      }

      // Exponential backoff: 100ms, 200ms for retries
      const delayMs = Math.pow(2, attempt) * 100;
      console.warn(`[DB] Query attempt ${attempt + 1} failed, retrying in ${delayMs}ms:`, lastError.message);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Execute a single row query
 */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the database connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Check if database is connected and tables exist
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await queryOne<{ count: string }>(
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'vf_sessions'"
    );
    return result ? parseInt(result.count, 10) > 0 : false;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
