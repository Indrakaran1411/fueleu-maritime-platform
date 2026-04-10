import { db } from './connection';

async function migrate(): Promise<void> {
  console.log('Running migrations...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS routes (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      route_id      VARCHAR(20) NOT NULL,
      vessel_type   VARCHAR(50) NOT NULL,
      fuel_type     VARCHAR(50) NOT NULL,
      year          INTEGER NOT NULL,
      ghg_intensity NUMERIC(10,4) NOT NULL,
      fuel_consumption NUMERIC(12,2) NOT NULL,
      distance      NUMERIC(12,2) NOT NULL,
      total_emissions NUMERIC(12,2) NOT NULL,
      is_baseline   BOOLEAN DEFAULT FALSE,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.query(`
    ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_route_id_key;
  `);

  await db.query(`
    DROP INDEX IF EXISTS routes_route_id_year_key;
  `);

  await db.query(`
    DO $$
    BEGIN
      ALTER TABLE routes
      ADD CONSTRAINT routes_route_id_year_key UNIQUE (route_id, year);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS ship_compliance (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ship_id    VARCHAR(20) NOT NULL,
      year       INTEGER NOT NULL,
      cb_gco2eq  NUMERIC(18,4) NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(ship_id, year)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS bank_entries (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ship_id        VARCHAR(20) NOT NULL,
      year           INTEGER NOT NULL,
      amount_gco2eq  NUMERIC(18,4) NOT NULL,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS pools (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      year       INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS pool_members (
      pool_id   UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
      ship_id   VARCHAR(20) NOT NULL,
      cb_before NUMERIC(18,4) NOT NULL,
      cb_after  NUMERIC(18,4) NOT NULL,
      PRIMARY KEY (pool_id, ship_id)
    );
  `);

  console.log('Migrations complete.');
  await db.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
