import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL tidak ada. Jalankan dengan --env-file=.env.local');
  process.exit(1);
}

const sql = neon(url);

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node --env-file=.env.local scripts/neon-migrate.mjs <file.sql> [...]');
  process.exit(1);
}

const splitStatements = (text) =>
  text
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);

for (const file of files) {
  const statements = splitStatements(readFileSync(file, 'utf8'));
  console.log(`Applying ${file} (${statements.length} statements) ...`);
  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log(`Done: ${file}`);
}
