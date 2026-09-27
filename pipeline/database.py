import os
from datetime import datetime, timezone

import psycopg2
from psycopg2.extras import RealDictCursor

DB_URL = os.environ["DATABASE_URL"]


def connect():
    return psycopg2.connect(DB_URL)


def create_table():
    con = connect()
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS snapshots (
            id          BIGINT GENERATED ALWAYS AS IDENTITY,
            taken_at    TIMESTAMPTZ NOT NULL,
            image_path  TEXT,
            lat         DOUBLE PRECISION,
            lon         DOUBLE PRECISION,
            status      TEXT DEFAULT 'new',
            coral_type  TEXT,
            health      TEXT,
            paleness    INTEGER,
            confidence  DOUBLE PRECISION,
            reason      TEXT,
            PRIMARY KEY (id, taken_at)
        )
    """)
    cur.execute("SELECT create_hypertable('snapshots', by_range('taken_at'), if_not_exists => TRUE)")
    cur.execute("ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS image_data BYTEA")
    cur.execute("ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS device_id TEXT")
    # columns written by the device (device/pi/capture.py)
    for column in ["temp_c DOUBLE PRECISION",        # Grid-EYE temperature from Arduino 1
                   "trigger TEXT",                   # why the photo was kept, e.g. 'auto'
                   "survey_id TEXT",                 # which dive / survey
                   "meta JSONB",                     # every tag the device saved, as JSON
                   "is_test BOOLEAN DEFAULT FALSE",  # TRUE for test or simulated data
                   "test_note TEXT"]:                # what is simulated and why
        cur.execute(f"ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS {column}")
    con.commit()
    con.close()


def add_snapshot(image_path, lat, lon, taken_at=None, device_id="demo-boat-1"):
    if taken_at is None:
        taken_at = datetime.now(timezone.utc)

    with open(image_path, "rb") as f:
        image_data = f.read()

    con = connect()
    cur = con.cursor()
    cur.execute(
        """INSERT INTO snapshots (image_path, taken_at, lat, lon, image_data, device_id)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (image_path, taken_at, lat, lon, psycopg2.Binary(image_data), device_id),
    )
    con.commit()
    con.close()


def show_all():
    con = connect()
    cur = con.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT id, taken_at, device_id, lat, lon, status, health, paleness,
               length(image_data) AS photo_bytes
        FROM snapshots
        ORDER BY taken_at
    """)
    for row in cur.fetchall():
        print(dict(row))
    con.close()


if __name__ == "__main__":
    create_table()
    show_all()