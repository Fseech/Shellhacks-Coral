# Reef Watch

Finds heat-resistant corals. A diver device photographs corals, AI scores their health, and NOAA heat data decides whether each coral is tougher than its neighbors.

Why this project exists, who it's for and what it looks for: read `README.md` before changing code.

## Architecture

Every part connects only to one cloud database. The parts never talk to each other; the `status` column hands work from one to the next.

| Part | Code | Database access | Picks up | Sets |
|------|------|-----------------|----------|------|
| Device (1 Arduino + Raspberry Pi) | `device/` | INSERT only | – | `status = 'new'` |
| AI scorer | `pipeline/worker.py` | SELECT + UPDATE | `status = 'new'` | `scored` or `error` |
| Heat analyzer | `pipeline/analyze.py` | SELECT + UPDATE | `status IN ('scored','analyzed')` | `analyzed` |
| Website | `website/` (React + Express, `webServer.ts`) | SELECT only | `status = 'analyzed'` | – |

Device: one Arduino reads temperature from a Grid-EYE sensor, has a start/stop recording button and shows status on a 16x2 screen. The Pi records video, keeps only important snapshots, tags each with time, location, depth and temperature, stores them locally, and uploads them over Wi-Fi.

## Layout

| Folder | What's in it |
|--------|--------------|
| `device/arduino_reefwatch/arduino_reefwatch.ino` | The Arduino sketch: Grid-EYE average, pin 2 record button, 16x2 screen (QAPASS 1602A, needs 5 V) |
| `device/pi/capture.py` | Raspberry Pi (or a Mac for testing): camera, snapshot filter, tagging, outbox, upload; sends screen lines to the Arduino |
| `device/pi/PI_SETUP.md` | Step-by-step Pi setup |
| `pipeline/` | Cloud programs: `database.py`, `worker.py`, `analyze.py`, `heat.py` (+ `heat_cache.json`) |
| `website/` | React site served by `webServer.ts` (`npm install`, `npm run dev`, port 3000). Reads `WEBSITE_DATABASE_URL` or `DATABASE_URL`; optional Gemini summary needs `GEMINI_API_KEY`. See `website/README.md` |

Run pipeline scripts from inside `pipeline/`: `heat.py` reads and writes `heat_cache.json` in the current folder. `capture.py` imports `database` from `pipeline/`.

Serial messages (USB, 115200 baud). The Pi finds the Arduino's port by what it sends:

| Direction | Message | Meaning |
|-----------|---------|---------|
| Arduino → Pi | `{"temp_c":24.6,"recording":1}` once a second and on every press | Grid-EYE average (`null` if the sensor is missing) and the button state |
| Arduino → Pi | `=== ReefWatch display ===` at startup | Tells the Pi this port also has the screen |
| Pi → Arduino | `1:Temp 24.6C` and `2:REC   Pics:12` once a second | Text for screen line 1 and line 2; until these arrive the sketch shows temperature and REC/Paused itself |

Wiring (Uno, same pins in every sketch): Grid-EYE SDA → A4, SCL → A5, VIN → 5V, GND → GND; button pin 2 → GND (no resistor, `INPUT_PULLUP`); screen RS 12, E 11, D4 5, D5 4, D6 3, D7 6, RW and V0 → GND, backlight A → 5V through 220 Ω. The QAPASS 1602A screen needs 5 V; a 3 V supply leaves it blank.

The Pi saves a snapshot only while recording is on. Location is a simulated boat route for the demo (`location_source = simulated`), and those rows are marked `is_test`. The Grid-EYE is infrared and reads the surface it sees, not water temperature.

Keep these access rules when changing code: the device never updates, processors never insert, and the website never writes.

## Running the device

One time, from `pipeline/` (adds the device columns):

```bash
cd pipeline
set -a; source ../.env; set +a
python3 -c "import database; database.create_table()"
```

Record (Mac for testing with its webcam, or the Pi with its camera module; see `device/pi/PI_SETUP.md`):

```bash
cd device/pi
set -a; source ../../.env; set +a
python3 capture.py --usb --demo-date 2023-08-20    # Mac: --usb uses the webcam
python3 capture.py --demo-date 2023-08-20          # Pi
```

- Close Arduino IDE's Serial Monitor first; only one program can use the port.
- Press the button to start and stop recording. `--always` ignores the button and records all the time (testing only).
- Photos wait in `device/pi/outbox/` and move to `device/pi/sent/` after upload. Both folders are git-ignored: never commit captured photos.
- Then run `python3 worker.py` and `python3 analyze.py` from `pipeline/`.

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
| `temp_c` | DOUBLE PRECISION | Grid-EYE temperature from the Arduino (°C), NULL if the sensor was missing |
| `depth_m` | DOUBLE PRECISION | depth in meters, entered by hand for now |
| `trigger` | TEXT | why the frame was kept, e.g. `auto` |
| `survey_id` | TEXT | which dive or survey |
| `meta` | JSONB | every tag the device saved (clock sync, location source, filter numbers, software version) |
| `is_test` | BOOLEAN | TRUE for test, demo or simulated-location data |
| `test_note` | TEXT | what is simulated and why |

The device columns are created by `database.create_table()` (run `python3 -c "import database; database.create_table()"` once from `pipeline/`), so the device itself only INSERTs.

Written by the AI scorer (`pipeline/worker.py`, Gemini):

| Column | Type | Meaning |
|--------|------|---------|
| `coral_type` | TEXT | common name, or `unknown` |
| `health` | TEXT | `healthy`, `pale`, `bleached`, `dead_algae`, or `not_coral` |
| `paleness` | INTEGER | 1 (dark, healthy) to 6 (completely white) |
| `confidence` | DOUBLE PRECISION | 0 to 1 |
| `reason` | TEXT | one-sentence description, or the error message when `status = 'error'` |

Written by the heat analyzer (`pipeline/analyze.py`, NOAA Coral Reef Watch via `heat.py`):

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
