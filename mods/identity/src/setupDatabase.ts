/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlRoot = join(__dirname, "../sql");
const migrationsDir = join(sqlRoot, "migrations");

const loadSqlFile = (relativePath: string) => {
  const filePath = join(sqlRoot, relativePath);
  return readFileSync(filePath, "utf-8");
};

const listMigrationFiles = () => {
  try {
    return readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();
  } catch {
    return [];
  }
};

const parseConnectionString = (connectionString: string) => {
  const url = new URL(connectionString);
  const database = url.pathname.slice(1);
  url.pathname = "/postgres";
  return {
    maintenanceUrl: url.toString(),
    database
  };
};

const ensureDatabaseExists = async (connectionString: string) => {
  const { maintenanceUrl, database } = parseConnectionString(connectionString);
  const client = new pg.Client({ connectionString: maintenanceUrl });
  await client.connect();

  const { rows } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);

  if (rows.length === 0) {
    await client.query(`CREATE DATABASE "${database}"`);
  }

  await client.end();
};

export async function setupIdentityDatabase(connectionString: string) {
  await ensureDatabaseExists(connectionString);

  const client = new pg.Client({ connectionString });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS identity_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const setupSql = loadSqlFile("setup.sql");
  await client.query(setupSql);

  const migrations = listMigrationFiles();
  for (const migration of migrations) {
    const { rows } = await client.query("SELECT 1 FROM identity_migrations WHERE id = $1 LIMIT 1", [
      migration
    ]);

    if (rows.length > 0) {
      continue;
    }

    const migrationSql = readFileSync(join(migrationsDir, migration), "utf-8");
    await client.query(migrationSql);
    await client.query("INSERT INTO identity_migrations (id) VALUES ($1)", [migration]);
  }

  await client.end();
}
