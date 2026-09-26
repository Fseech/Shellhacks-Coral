# Reef Watch

Finds heat-resistant corals. A diver device photographs corals, AI scores their health, and NOAA heat data decides whether each coral is tougher than its neighbors.

## Architecture

Every part connects only to one cloud database. The parts never talk to each other; the `status` column hands work from one to the next.

| Part | Code | Database access | Picks up | Sets |
|------|------|-----------------|----------|------|
| Device (2 Arduinos + Raspberry Pi) | not in repo yet | INSERT only | – | `status = 'new'` |
| AI scorer | `worker.py` | SELECT + UPDATE | `status = 'new'` | `scored` or `error` |
| Heat analyzer | `analyze.py` | SELECT + UPDATE | `status IN ('scored','analyzed')` | `analyzed` |
| Website | `dashboard.py` (Streamlit) | SELECT only | `status = 'analyzed'` | – |

Device: Arduino 1 reads temperature from a Grid-EYE sensor and has a start/stop recording button. Arduino 2 shows status on an LED screen. The Pi records video, keeps only important snapshots, tags each with time, location, depth and temperature, stores them locally, and uploads them over Wi-Fi.

Keep these access rules when changing code: the device never updates, processors never insert, and the website never writes.

## Database

- Tiger Cloud (Postgres + TimescaleDB), database `tsdb`.
- Connection string comes from the `DATABASE_URL` env var (in `.env`, load with `set -a; source .env; set +a`). Never hardcode it or copy the password into code.
- Connect with `database.connect()`.

### `snapshots` table

A hypertable partitioned on `taken_at`. Primary key is `(id, taken_at)`, so UPDATEs must filter on both.

Written by the device:

| Column | Type | Meaning |
|--------|------|---------|
| `id` | BIGINT identity | row number |
| `taken_at` | TIMESTAMPTZ | when the snapshot was taken (UTC) |
| `device_id` | TEXT | which device, e.g. `demo-boat-1` |
| `lat`, `lon` | DOUBLE PRECISION | GPS position |
| `image_data` | BYTEA | the JPEG bytes (photos are stored in the database) |
| `image_path` | TEXT | original file name, label only |
| `status` | TEXT | default `'new'` |

Written by the AI scorer (`worker.py`, Gemini):

| Column | Type | Meaning |
|--------|------|---------|
| `coral_type` | TEXT | common name, or `unknown` |
| `health` | TEXT | `healthy`, `pale`, `bleached`, `dead_algae`, or `not_coral` |
| `paleness` | INTEGER | 1 (dark, healthy) to 6 (completely white) |
| `confidence` | DOUBLE PRECISION | 0 to 1 |
| `reason` | TEXT | one-sentence description, or the error message when `status = 'error'` |

Written by the heat analyzer (`analyze.py`, NOAA Coral Reef Watch via `heat.py`):

| Column | Type | Meaning |
|--------|------|---------|
| `dhw` | DOUBLE PRECISION | Degree Heating Weeks at that place and date |
| `neighbor_count` | INTEGER | living corals within 50 m and 7 days |
| `neighbor_median` | DOUBLE PRECISION | neighbors' median paleness |
| `verdict` | TEXT | see below |
| `verdict_reason` | TEXT | plain-English explanation shown on the website |

Planned, not in the table yet: `depth_m` and `temp_c` (Grid-EYE temperature) from the device.

### Verdicts

High heat means `dhw >= 4`.

- `resistant_candidate`: high heat, and the coral is at least 2 paleness points darker than its neighbors' median.
- `non_heat_stress`: low heat, but the coral and its neighbors are pale (both >= 4). Something besides heat, such as sewage, runoff or disease.
- `regular`: fits its neighbors and the heat.
- `needs_more_data`: fewer than 2 neighbors, or no NOAA value.
- `dead_or_algae`, `not_coral`: excluded from neighbor comparisons.

## Known gaps

- All programs share one admin login, so the access rules above are not enforced by the database. The plan is separate `device`, `processor` and `website` roles.
