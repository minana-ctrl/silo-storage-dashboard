import { Pool, PoolClient } from 'pg';

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
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
}

/**
 * Execute a query with optional parameters
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: (string | number | boolean | null | undefined)[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const client = await getPool().connect();
  
  try {
    const result = await client.query(text, params);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount,
    };
  } finally {
    client.release();
  }
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
