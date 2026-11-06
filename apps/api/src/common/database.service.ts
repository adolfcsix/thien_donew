import { Injectable, Logger, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

/** PostgreSQL is owned by the API, never imported by the browser. */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  // Includes active leases and pool waiters, shared by queries and transactions.
  // Per process: 10 connections, at most 54 additional admitted operations.
  private admitted = 0;
  private closing = false;
  private admit(): () => void {
    if (this.closing || this.admitted >= 64) throw new ServiceUnavailableException('Hệ thống đang bận, vui lòng thử lại sau');
    this.admitted++;
    return () => { this.admitted--; };
  }
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

  async query<T extends QueryResultRow = Record<string, unknown>>(sql: string, params: unknown[] = []) {
    const release = this.admit();
    try { return await this.pool.query<T>(sql, params); }
    finally { release(); }
  }

  /** Always roll back on failure and release the connection, including after errors. */
  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const releaseAdmission = this.admit();
    try {
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
    } finally { releaseAdmission(); }
  }

  async onModuleDestroy() { this.closing = true; await this.pool.end(); }
}
