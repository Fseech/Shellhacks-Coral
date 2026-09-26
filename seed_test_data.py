"""Creates labeled TEST DATA: simulated reef surveys every ~2 months in 2023-2024,
in each region from regions.py. Heat values are REAL (NOAA); how bleached each simulated
survey is follows that real heat. Every row is marked is_test = TRUE.

Run:  python3 seed_test_data.py           (add test data)
      python3 seed_test_data.py --reset   (first delete old test/demo rows, then add)"""
import json
import os
import random
import sys
from datetime import datetime, timedelta, timezone

import psycopg2
from psycopg2.extras import execute_values

from database import connect, create_table
from heat import get_dhw_series
from regions import REGIONS

FOLDER = "test_images"
START, END = "2023-01-01", "2024-12-31"
EVERY_WEEKS = 8            # one simulated survey about every 2 months
CORALS_PER_SURVEY = 4

# how likely each condition is, depending on the real heat (DHW) that week:
#           heat below   healthy pale  bleached dead
CONDITION_MIX = [(2,     [0.85, 0.15, 0.00, 0.00]),
                 (4,     [0.55, 0.30, 0.15, 0.00]),
                 (8,     [0.25, 0.30, 0.40, 0.05]),
                 (999,   [0.10, 0.20, 0.50, 0.20])]
CONDITIONS = ["healthy", "pale", "bleached", "dead"]

random.seed(42)   # same "random" data every time you run it


def load_photo_pools():
    with open(os.path.join(FOLDER, "scores.json")) as f:
        scores = json.load(f)
    pools = {c: [] for c in CONDITIONS}
    for name, s in scores.items():
        if not s["is_coral"]:
            continue
        if s["health"] == "dead_algae":
            pools["dead"].append(name)
        elif s["paleness"] <= 2:
            pools["healthy"].append(name)
        elif s["paleness"] <= 4:
            pools["pale"].append(name)
        else:
            pools["bleached"].append(name)
    if not pools["healthy"] or not pools["bleached"]:
        sys.exit("Need at least one healthy and one bleached photo. Add more photos and re-score.")
    pools["pale"] = pools["pale"] or pools["bleached"]
    pools["dead"] = pools["dead"] or pools["bleached"]
    print({c: len(p) for c, p in pools.items()}, "photos per condition")
    return pools, scores


def pick_condition(dhw):
    for limit, chances in CONDITION_MIX:
        if dhw < limit:
            return random.choices(CONDITIONS, weights=chances)[0]


def main():
    create_table()
    con = connect()
    cur = con.cursor()
    cur.execute("ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE")
    cur.execute("ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS test_note TEXT")
    if "--reset" in sys.argv:
        cur.execute("DELETE FROM snapshots WHERE is_test = TRUE OR device_id = 'demo-boat-1'")
        print("Deleted", cur.rowcount, "old test/demo rows.")
    con.commit()

    pools, scores = load_photo_pools()
    photo_bytes = {}
    total = 0
    planted = False

    for region, (lat, lon) in REGIONS.items():
        try:
            series = get_dhw_series(lat, lon, START, END, every_days=7)
        except Exception as e:
            print(f"{region}: NOAA heat lookup failed ({e}) - skipped")
            continue
        surveys = [(day, dhw) for day, dhw in series[::EVERY_WEEKS] if dhw is not None]
        if not surveys:
            print(f"{region}: NOAA has no heat data at this point (maybe on land) - skipped")
            continue

        rows = []
        for day, dhw in surveys:
            note = "simulated survey"
            force = None
            # plant ONE clearly-labeled scenario: pale corals in cool water (e.g. pollution)
            if not planted and region.startswith("Florida Keys - Molasses") and dhw < 1:
                force, note, planted = "bleached", "planted scenario: pale corals in cool water (simulated pollution)", True

            start = datetime.fromisoformat(day).replace(hour=10, tzinfo=timezone.utc)
            for i in range(CORALS_PER_SURVEY):
                condition = force or pick_condition(dhw)
                name = random.choice(pools[condition])
                if name not in photo_bytes:
                    with open(os.path.join(FOLDER, name), "rb") as f:
                        photo_bytes[name] = f.read()
                s = scores[name]
                rows.append((
                    f"{FOLDER}/{name}",
                    start + timedelta(seconds=20 * i),
                    lat + random.uniform(-0.00015, 0.00015),   # a few meters apart
                    lon + random.uniform(-0.00015, 0.00015),
                    psycopg2.Binary(photo_bytes[name]),
                    "test-data",
                    "scored",
                    s["coral_type"], s["health"], s["paleness"], s["confidence"], s["reason"],
                    True, note,
                ))

        execute_values(cur, """
            INSERT INTO snapshots (image_path, taken_at, lat, lon, image_data, device_id, status,
                                   coral_type, health, paleness, confidence, reason, is_test, test_note)
            VALUES %s""", rows)
        con.commit()
        total += len(rows)
        print(f"{region}: {len(surveys)} surveys, {len(rows)} test snapshots")

    con.close()
    print(f"Done: {total} TEST snapshots added. Now run analyze.py to compute verdicts.")


if __name__ == "__main__":
    main()
