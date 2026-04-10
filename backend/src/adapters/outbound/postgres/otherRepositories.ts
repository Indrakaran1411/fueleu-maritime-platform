import { ComplianceRepository, BankRepository, PoolRepository } from '../../../core/ports/repositories';
import { ShipCompliance, BankEntry, Pool } from '../../../core/domain/entities';
import { query, db } from '../../../infrastructure/db/connection';

// ─── Compliance Repository ─────────────────────────────────────────────────

interface ComplianceRow {
  id: string;
  ship_id: string;
  year: number;
  cb_gco2eq: string;
}

export class PgComplianceRepository implements ComplianceRepository {
  async upsert(data: Omit<ShipCompliance, 'id'>): Promise<ShipCompliance> {
    const rows = await query<ComplianceRow>(`
      INSERT INTO ship_compliance (ship_id, year, cb_gco2eq, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (ship_id, year) DO UPDATE SET cb_gco2eq = EXCLUDED.cb_gco2eq, updated_at = NOW()
      RETURNING *
    `, [data.shipId, data.year, data.cbGco2eq]);

    const row = rows[0];
    return { id: row.id, shipId: row.ship_id, year: Number(row.year), cbGco2eq: parseFloat(row.cb_gco2eq) };
  }

  async findByShipAndYear(shipId: string, year: number): Promise<ShipCompliance | null> {
    const rows = await query<ComplianceRow>(
      'SELECT * FROM ship_compliance WHERE ship_id = $1 AND year = $2',
      [shipId, year]
    );
    if (!rows.length) return null;
    const row = rows[0];
    return { id: row.id, shipId: row.ship_id, year: Number(row.year), cbGco2eq: parseFloat(row.cb_gco2eq) };
  }
}

// ─── Bank Repository ──────────────────────────────────────────────────────

interface BankRow {
  id: string;
  ship_id: string;
  year: number;
  amount_gco2eq: string;
  created_at: Date;
}

export class PgBankRepository implements BankRepository {
  async findByShipAndYear(shipId: string, year: number): Promise<BankEntry[]> {
    const rows = await query<BankRow>(
      'SELECT * FROM bank_entries WHERE ship_id = $1 AND year <= $2 ORDER BY year, created_at',
      [shipId, year]
    );
    return rows.map(r => ({
      id: r.id,
      shipId: r.ship_id,
      year: Number(r.year),
      amountGco2eq: parseFloat(r.amount_gco2eq),
      createdAt: r.created_at,
    }));
  }

  async getTotalBanked(shipId: string, year: number): Promise<number> {
    const rows = await query<{ total: string }>(
      'SELECT COALESCE(SUM(amount_gco2eq), 0) AS total FROM bank_entries WHERE ship_id = $1 AND year <= $2',
      [shipId, year]
    );
    return parseFloat(rows[0].total);
  }

  async create(entry: Omit<BankEntry, 'id' | 'createdAt'>): Promise<BankEntry> {
    const rows = await query<BankRow>(`
      INSERT INTO bank_entries (ship_id, year, amount_gco2eq)
      VALUES ($1, $2, $3) RETURNING *
    `, [entry.shipId, entry.year, entry.amountGco2eq]);
    const r = rows[0];
    return { id: r.id, shipId: r.ship_id, year: Number(r.year), amountGco2eq: parseFloat(r.amount_gco2eq), createdAt: r.created_at };
  }

  async deductBanked(shipId: string, year: number, amount: number): Promise<void> {
    // Delete entries oldest-first until amount is fully deducted
    const entries = await this.findByShipAndYear(shipId, year);
    let remaining = amount;
    for (const entry of entries) {
      if (remaining <= 0) break;
      if (entry.amountGco2eq <= remaining) {
        await db.query('DELETE FROM bank_entries WHERE id = $1', [entry.id]);
        remaining -= entry.amountGco2eq;
      } else {
        const newAmount = entry.amountGco2eq - remaining;
        await db.query('UPDATE bank_entries SET amount_gco2eq = $1 WHERE id = $2', [newAmount, entry.id]);
        remaining = 0;
      }
    }
  }
}

// ─── Pool Repository ──────────────────────────────────────────────────────

interface PoolRow { id: string; year: number; created_at: Date; }
interface PoolMemberRow { pool_id: string; ship_id: string; cb_before: string; cb_after: string; }

export class PgPoolRepository implements PoolRepository {
  async create(
    year: number,
    members: Array<{ shipId: string; cbBefore: number; cbAfter: number }>
  ): Promise<Pool> {
    const poolRows = await query<PoolRow>(
      'INSERT INTO pools (year) VALUES ($1) RETURNING *',
      [year]
    );
    const pool = poolRows[0];

    const poolMembers = [];
    for (const m of members) {
      const mRows = await query<PoolMemberRow>(`
        INSERT INTO pool_members (pool_id, ship_id, cb_before, cb_after)
        VALUES ($1, $2, $3, $4) RETURNING *
      `, [pool.id, m.shipId, m.cbBefore, m.cbAfter]);
      const mr = mRows[0];
      poolMembers.push({
        poolId: mr.pool_id,
        shipId: mr.ship_id,
        cbBefore: parseFloat(mr.cb_before),
        cbAfter: parseFloat(mr.cb_after),
      });
    }

    return { id: pool.id, year: Number(pool.year), members: poolMembers, createdAt: pool.created_at };
  }

  async findById(id: string): Promise<Pool | null> {
    const poolRows = await query<PoolRow>('SELECT * FROM pools WHERE id = $1', [id]);
    if (!poolRows.length) return null;
    const pool = poolRows[0];
    const memberRows = await query<PoolMemberRow>('SELECT * FROM pool_members WHERE pool_id = $1', [id]);
    return {
      id: pool.id,
      year: Number(pool.year),
      createdAt: pool.created_at,
      members: memberRows.map(mr => ({
        poolId: mr.pool_id,
        shipId: mr.ship_id,
        cbBefore: parseFloat(mr.cb_before),
        cbAfter: parseFloat(mr.cb_after),
      })),
    };
  }

  async findAll(): Promise<Pool[]> {
    const poolRows = await query<PoolRow>('SELECT * FROM pools ORDER BY created_at DESC');
    const pools: Pool[] = [];
    for (const pool of poolRows) {
      const memberRows = await query<PoolMemberRow>('SELECT * FROM pool_members WHERE pool_id = $1', [pool.id]);
      pools.push({
        id: pool.id,
        year: Number(pool.year),
        createdAt: pool.created_at,
        members: memberRows.map(mr => ({
          poolId: mr.pool_id,
          shipId: mr.ship_id,
          cbBefore: parseFloat(mr.cb_before),
          cbAfter: parseFloat(mr.cb_after),
        })),
      });
    }
    return pools;
  }
}
