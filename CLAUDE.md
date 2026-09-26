# Reef Watch

Finds heat-resistant corals. A diver device photographs corals, AI scores their health, and NOAA heat data decides whether each coral is tougher than its neighbors.

## Architecture

Every part connects only to one cloud database. The parts never talk to each other; the `status` column hands work from one to the next.

| Part | Code | Database access | Picks up | Sets |
|------|------|-----------------|----------|------|
| Device (2 Arduinos + Raspberry Pi) | `device/` | INSERT only | – | `status = 'new'` |
| AI scorer | `worker.py` | SELECT + UPDATE | `status = 'new'` | `scored` or `error` |
| Heat analyzer | `analyze.py` | SELECT + UPDATE | `status IN ('scored','analyzed')` | `analyzed` |
| Website | `dashboard.py` (Streamlit) | SELECT only | `status = 'analyzed'` | – |

Device: Arduino 1 reads temperature from a Grid-EYE sensor and has a start/stop recording button. Arduino 2 shows status on an LED screen. The Pi records video, keeps only important snapshots, tags each with time, location, depth and temperature, stores them locally, and uploads them over Wi-Fi.

### Device code (`device/`)

| File | Runs on | Job |
|------|---------|-----|
| `device/arduino_reefwatch/arduino_reefwatch.ino` | One Arduino | Sensor + button + screen merged into one sketch; the Pi uses its single port for both jobs |
| `device/arduino_sensor/arduino_sensor.ino` | Arduino 1 | Averages the Grid-EYE's 64 pixels into one temperature; pin 2 button toggles recording |
| `device/arduino_display/arduino_display.ino` | Arduino 2 | Shows the lines the Pi sends on the 16x2 screen (QAPASS 1602A, needs 5 V) |
| `device/arduino_all_in_one/arduino_all_in_one.ino` | One Arduino (breadboard prototype) | Sensor, button and screen together; use instead of the two sketches above when everything is on one board |
| `device/pi/capture.py` | Raspberry Pi | Camera, snapshot filter, tagging, outbox, upload; relays temperature and status to the screen |
| `device/pi/PI_SETUP.md` | – | Step-by-step Pi setup |

Both Arduinos plug into the Pi by USB at 115200 baud. The Pi tells them apart by what they send:

| Direction | Message | Meaning |
|-----------|---------|---------|
| Arduino 1 → Pi | `{"temp_c":24.6,"recording":1}` once a second and on every press | Grid-EYE average (`null` if the sensor is missing) and the button state |
| Arduino 2 → Pi | `=== ReefWatch display ===` at startup | Identifies the screen Arduino |
| Pi → Arduino 2 | `1:Temp 24.6C` and `2:REC   Pics:12` once a second | Text for screen line 1 and line 2 |

The Pi saves a snapshot only while recording is on. Location is a simulated boat route for the demo (`location_source = simulated`), and those rows are marked `is_test`. The Grid-EYE is infrared and reads the surface it sees, not water temperature.

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
| `temp_c` | DOUBLE PRECISION | Grid-EYE temperature from Arduino 1 (°C), NULL if the sensor was missing |
| `depth_m` | DOUBLE PRECISION | depth in meters, entered by hand for now |
| `trigger` | TEXT | why the frame was kept, e.g. `auto` |
| `survey_id` | TEXT | which dive or survey |
| `meta` | JSONB | every tag the device saved (clock sync, location source, filter numbers, software version) |
| `is_test` | BOOLEAN | TRUE for test, demo or simulated-location data |
| `test_note` | TEXT | what is simulated and why |

The device columns are created by `database.create_table()` (run `python3 -c "import database; database.create_table()"` once from the repo folder), so the device itself only INSERTs.

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

### Verdicts

High heat means `dhw >= 4`.

- `resistant_candidate`: high heat, and the coral is at least 2 paleness points darker than its neighbors' median.
- `non_heat_stress`: low heat, but the coral and its neighbors are pale (both >= 4). Something besides heat, such as sewage, runoff or disease.
- `regular`: fits its neighbors and the heat.
- `needs_more_data`: fewer than 2 neighbors, or no NOAA value.
- `dead_or_algae`, `not_coral`: excluded from neighbor comparisons.

## Known gaps

- All programs share one admin login, so the access rules above are not enforced by the database. The plan is separate `device`, `processor` and `website` roles.
