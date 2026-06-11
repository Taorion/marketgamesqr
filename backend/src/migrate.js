const fs = require("fs/promises");
const path = require("path");
const { pool } = require("./config/db");

async function main() {
  const schemaPath = path.join(__dirname, "../..", "database", "schema.sql");
  const sql = await fs.readFile(schemaPath, "utf8");
  await pool.query(sql);

  await pool.query(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const migrationsDir = path.join(__dirname, "../..", "database", "migrations");
  const files = await fs.readdir(migrationsDir).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });

  for (const file of files.filter((item) => item.endsWith(".sql")).sort()) {
    const id = file.replace(/\.sql$/i, "");
    const existing = await pool.query("select id from schema_migrations where id = $1", [id]);
    if (existing.rowCount) {
      continue;
    }

    const migrationSql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(migrationSql);
      await client.query("insert into schema_migrations (id) values ($1)", [id]);
      await client.query("commit");
      console.log(`Applied migration ${file}.`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  console.log("Database migration complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
