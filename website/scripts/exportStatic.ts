// Finishes the static build (npm run build:static): reads every analyzed snapshot once (SELECT only) and
// writes the data snapshot, photos and download files into dist-static/, ready to upload to any web host.
import dotenv from 'dotenv';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: [path.join(websiteRoot, '.env'), path.resolve(websiteRoot, '../.env')], quiet: true });

const out = path.join(websiteRoot, 'dist-static');
const databaseUrl = process.env.WEBSITE_DATABASE_URL || process.env.DATABASE_URL;
const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : new Pool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT) || 5432,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl: process.env.PGSSLMODE === 'disable' ? false : process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : true,
    });

const COLUMNS = ['id', 'taken_at', 'device_id', 'lat', 'lon', 'coral_type', 'health', 'paleness', 'confidence', 'reason',
  'dhw', 'neighbor_count', 'neighbor_median', 'verdict', 'verdict_reason', 'temp_c', 'is_test', 'image_path', 'image_url'] as const;

function csvCell(value: unknown) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  const safe = /^[=+\-@]/.test(text) && !/^-?\d/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

const { rows } = await pool.query(
  `SELECT s.id::text AS id,
          to_char(s.taken_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS taken_at,
          s.device_id, s.lat, s.lon, s.image_path, s.image_data,
          (s.image_data IS NOT NULL) AS has_image,
          COALESCE((to_jsonb(s)->>'is_test')::boolean, false) AS is_test,
          s.coral_type, s.health, s.paleness, s.confidence, s.reason,
          s.dhw, s.neighbor_count, s.neighbor_median, s.verdict, s.verdict_reason,
          NULLIF(to_jsonb(s)->>'temp_c', '')::double precision AS temp_c
   FROM snapshots s
   WHERE s.status = 'analyzed' AND s.lat IS NOT NULL AND s.lon IS NOT NULL
   ORDER BY s.taken_at, s.id`,
);
await pool.end();

await mkdir(path.join(out, 'data', 'images'), { recursive: true });
const snapshot = [];
for (const { image_data: image, ...row } of rows) {
  if (image) await writeFile(path.join(out, 'data', 'images', `${row.id}.jpg`), image);
  snapshot.push(row);
}
await writeFile(path.join(out, 'data', 'snapshots.json'), JSON.stringify(snapshot));

const records = snapshot.map((row) => Object.fromEntries(COLUMNS.map((column) => [
  column,
  column === 'image_url' ? (row.has_image ? `/data/images/${row.id}.jpg` : null) : row[column as keyof typeof row] ?? null,
])));
await writeFile(path.join(out, 'data', 'reef-watch.json'), JSON.stringify({
  source: 'Reef Watch analyzed coral snapshots',
  exported_at: new Date().toISOString(),
  count: records.length,
  notes: 'dhw is NOAA Coral Reef Watch Degree Heating Weeks; paleness 1 (dark) to 6 (white); is_test marks simulated observations.',
  records,
}, null, 2));
await writeFile(path.join(out, 'data', 'reef-watch.csv'),
  [COLUMNS.join(','), ...records.map((record) => COLUMNS.map((column) => csvCell(record[column])).join(','))].join('\n'));

// /explore must work as a plain folder on hosts that don't rewrite URLs
await mkdir(path.join(out, 'explore'), { recursive: true });
await copyFile(path.join(out, 'index.html'), path.join(out, 'explore', 'index.html'));

console.log(`Static site ready in dist-static/: ${snapshot.length} snapshots, ${rows.filter((row) => row.image_data).length} photos.`);
