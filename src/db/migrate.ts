import { pool } from "./connection";

const migrations = [
  `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS monitors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,
    url TEXT NOT NULL,
    interval INTEGER NOT NULL DEFAULT 60,
    timeout INTEGER NOT NULL DEFAULT 30,
    retries INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    method VARCHAR(10) DEFAULT 'GET',
    accepted_status_codes TEXT[] DEFAULT ARRAY['200-299'],
    keyword TEXT,
    dns_resolve_type VARCHAR(10),
    dns_resolve_server VARCHAR(255),
    max_redirects INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS heartbeats (
    id SERIAL PRIMARY KEY,
    monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    status INTEGER NOT NULL,
    ping INTEGER,
    msg TEXT,
    time TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )
  `,
  `CREATE INDEX IF NOT EXISTS heartbeats_monitor_id_idx ON heartbeats(monitor_id)`,
  `CREATE INDEX IF NOT EXISTS heartbeats_time_idx ON heartbeats(time)`,
  `CREATE INDEX IF NOT EXISTS heartbeats_monitor_time_idx ON heartbeats(monitor_id, time)`,
  `
  CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,
    config JSONB NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS monitor_notifications (
    monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    PRIMARY KEY (monitor_id, notification_id)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS status_pages (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url TEXT,
    public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS status_page_monitors (
    status_page_id INTEGER NOT NULL REFERENCES status_pages(id) ON DELETE CASCADE,
    monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (status_page_id, monitor_id)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    cause TEXT
  )
  `,
  `CREATE INDEX IF NOT EXISTS incidents_monitor_id_idx ON incidents(monitor_id)`,
];

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version INTEGER NOT NULL UNIQUE,
        run_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);

    for (let i = 0; i < migrations.length; i++) {
      const version = i + 1;
      const { rows } = await client.query(
        "SELECT id FROM schema_migrations WHERE version = $1",
        [version]
      );
      if (rows.length === 0) {
        await client.query(migrations[i]);
        await client.query(
          "INSERT INTO schema_migrations (version) VALUES ($1)",
          [version]
        );
        console.log(`Migration ${version} applied`);
      }
    }
    await client.query("COMMIT");
    console.log("Migrations complete");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
