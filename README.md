# Reef Watch

A low-cost device and cloud pipeline that finds corals that might resist heat. It photographs corals, uses AI to score how bleached each one is, and compares that score with NOAA satellite heat-stress data for the same place and date. A coral that stays healthy while its neighbors bleach in the same heat is flagged as a **resistant candidate**, a lead that marine biologists can follow up for coral nurseries.

## How it works

```
 Arduino (Grid-EYE, button, screen)
        │ USB
 Raspberry Pi + camera ──Wi-Fi──▶  Cloud database (Tiger Cloud, Postgres + TimescaleDB)
   keeps key frames,                       ▲                    ▲
   tags time, place,                       │                    │
   depth, temperature              AI scorer (Gemini)   Heat analyzer (NOAA)
                                   paleness 1–6         Degree Heating Weeks
                                                        + neighbor comparison
```

1. **Device.** Press the button to start recording. The Pi keeps only frames that look like reef and have changed since the last one. It tags each frame with time, location, depth and temperature and saves it locally, then uploads it when Wi-Fi is available. The screen shows the temperature, recording state and photo count.
2. **AI scorer** (`pipeline/worker.py`). Sends each new photo to Gemini, which returns the coral type, its health and a paleness score from 1 (dark and healthy) to 6 (completely white).
3. **Heat analyzer** (`pipeline/analyze.py`). Looks up NOAA Coral Reef Watch heat stress for that place and date, compares the coral with others within 50 m photographed within 7 days, and records a verdict:

   | Verdict | Meaning |
   |---------|---------|
   | Resistant candidate | High heat (4+ Degree Heating Weeks), neighbors paled, this coral stayed at least 2 points darker |
   | Something besides heat | Low heat, but this patch is pale: check for sewage, runoff or disease |
   | As expected | The coral's color fits its neighbors and the heat |

4. **Website** (`website/`). Browse observations, resistant candidates and trends.

Each part talks only to the database, never to the other parts. The device only adds rows, the processing programs only read and update them, and the website only reads. Any part can be restarted or replaced on its own, and more devices can be added anywhere without changing anything else.

## Repository

| Folder | Contents |
|--------|----------|
| `device/arduino_reefwatch/` | Arduino sketch: Grid-EYE temperature, record button, 16x2 screen |
| `device/pi/` | `capture.py` (camera, frame filter, tagging, offline outbox, upload) and `PI_SETUP.md` |
| `pipeline/` | Database schema, AI scorer, heat analyzer, NOAA client and test-data tools |
| `website/` | React + Express front end |

## Running it

```bash
# cloud pipeline (needs DATABASE_URL and a Gemini API key)
cd pipeline
python3 -c "import database; database.create_table()"   # once
python3 worker.py      # AI scorer
python3 analyze.py     # heat analyzer

# device: flash device/arduino_reefwatch to the Arduino, then on the Pi:
python3 capture.py     # see device/pi/PI_SETUP.md

# website
cd website && npm install && npm run dev   # http://localhost:3000
```

## Honest limits

- **Location.** GPS doesn't work underwater. For the demo, snapshots use a simulated boat route, and those rows are marked as test data in the database.
- **Temperature.** The Grid-EYE is an infrared sensor and reads the surface it sees, not the water. A waterproof probe (DS18B20) or a pressure/temperature sensor (MS5837) would replace it on a real dive.
- **Heat data.** NOAA's heat-stress data comes on a grid about 5 km wide, so neighboring corals share one heat value. The verdict marks candidates for testing; it doesn't prove heat resistance.
- **Website data.** The website currently shows sample observations. The pipeline's results are stored in the database but aren't connected to the site yet.
- **Test photos.** The test photos are freely licensed images from Wikimedia Commons. The photographer and license for each one are in `pipeline/test_images/credits.csv`.
