import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

/** PostgreSQL is owned by the API, never imported by the browser. */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://thiendo:thiendo_dev@localhost:5432/thiendo',
    max: 10,
    // A broken/misconfigured database must not stall API handlers indefinitely.
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 10_000,
    lock_timeout: 5_000,
    idle_in_transaction_session_timeout: 15_000,
  });

  constructor() {
    // pg removes the failed idle client itself. Consume its error event so a
    // database restart does not become an unhandled EventEmitter exception.
    this.pool.on('error', () => {
      // Do not log raw pg errors: they may include SQL, parameters or credentials.
      Logger.warn('PostgreSQL idle connection lost; the pool will reconnect on demand.', 'DatabaseService');
    });
  }

  query<T extends QueryResultRow = Record<string, unknown>>(sql: string, params: unknown[] = []) {
    return this.pool.query<T>(sql, params);
  }

  /** Always roll back on failure and release the connection, including after errors. */
  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let discardClient = false;
    try {
      await client.query('BEGIN');
      const value = await work(client);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      // A broken connection may also reject ROLLBACK; preserve the originating failure.
      try { await client.query('ROLLBACK'); }
      catch { discardClient = true; /* do not return a broken connection to the pool */ }
      throw error;
    } finally {
      client.release(discardClient);
    }
  }

  async onModuleDestroy() { await this.pool.end(); }
}
