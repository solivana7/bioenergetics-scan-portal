import { Pool } from "pg";

let pool: Pool | null = null;
let dbInitialized = false;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function initDb(): Promise<void> {
  if (dbInitialized) return; // Run once per process lifetime
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_emails (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Add unique constraint idempotently. Postgres has no ADD CONSTRAINT IF NOT EXISTS,
    // and the underlying index counts as a relation, so the error can surface as
    // duplicate_object OR duplicate_table depending on history. Easiest: check pg_constraint
    // first and only ADD if missing.
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uniq_name_email'
        ) THEN
          ALTER TABLE client_emails ADD CONSTRAINT uniq_name_email UNIQUE (name, email);
        END IF;
      END $$;
    `);
    // Webhook idempotency table — dedupe Stripe event retries
    await client.query(`
      CREATE TABLE IF NOT EXISTS processed_stripe_events (
        event_id TEXT PRIMARY KEY,
        processed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    dbInitialized = true;
  } finally {
    client.release();
  }
}

export async function saveClientEmail(name: string, email: string): Promise<void> {
  await initDb();
  const client = await getPool().connect();
  try {
    await client.query(
      `INSERT INTO client_emails (name, email) VALUES ($1, $2) ON CONFLICT (name, email) DO NOTHING`,
      [name.toLowerCase().trim(), email.toLowerCase().trim()]
    );
  } finally {
    client.release();
  }
}

// Returns true the first time this Stripe event_id is seen; false on every subsequent retry.
// Use to gate webhook side-effects so duplicate Stripe deliveries don't double-email or double-write.
export async function claimStripeEvent(eventId: string): Promise<boolean> {
  if (!eventId) return false;
  await initDb();
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `INSERT INTO processed_stripe_events (event_id) VALUES ($1) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [eventId]
    );
    return res.rows.length === 1;
  } finally {
    client.release();
  }
}

export async function verifyPaidEmail(email: string): Promise<boolean> {
  if (!email) return false;
  await initDb();
  const normalized = email.toLowerCase().trim();
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `SELECT 1 FROM client_emails WHERE LOWER(email) = $1 LIMIT 1`,
      [normalized]
    );
    return res.rows.length > 0;
  } finally {
    client.release();
  }
}

// Right-to-erasure: delete a client by email (CCPA compliance hook).
export async function deleteClientByEmail(email: string): Promise<number> {
  if (!email) return 0;
  await initDb();
  const normalized = email.toLowerCase().trim();
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `DELETE FROM client_emails WHERE LOWER(email) = $1`,
      [normalized]
    );
    return res.rowCount ?? 0;
  } finally {
    client.release();
  }
}
