"""
color_demo.py - LIVE DEMO scorer: red card = alive coral, blue card = dead coral.

For the judges' demo we pass colored cards in front of the camera instead of real coral.
  capture.py --color-demo   saves a snapshot when a red or blue card fills part of the frame
                            (trigger = 'color_demo', simulated location, no temperature)
  color_demo.py             (this file) scores those rows: red -> alive, blue -> dead,
                            and marks them 'analyzed' so the website shows them right away.
                            NO heat data: NOAA DHW is skipped for demo rows.

worker.py (Gemini) and analyze.py (heat) ignore rows with trigger = 'color_demo',
so real-coral scoring keeps working unchanged next to the demo.

Run from pipeline/:
    set -a; source ../.env; set +a
    python3 color_demo.py
"""
import time

import cv2
import numpy as np

DEMO_TRIGGER = "color_demo"
MIN_CARD_FRACTION = 0.12   # a color must cover at least 12% of the picture to count


def color_fractions(bgr):
    """Share of the picture that is strongly red and strongly blue (0 to 1 each)."""
    small = cv2.resize(bgr, (160, 120), interpolation=cv2.INTER_AREA)
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    vivid = (sat >= 100) & (val >= 60)                    # ignore grey, white and very dark pixels
    red = vivid & ((hue <= 10) | (hue >= 165))            # OpenCV hue runs 0-179; red wraps around 0
    blue = vivid & (hue >= 95) & (hue <= 130)
    return float(red.mean()), float(blue.mean())


def classify(bgr):
    """Returns ('alive' | 'dead' | None, red_fraction, blue_fraction)."""
    red, blue = color_fractions(bgr)
    if max(red, blue) < MIN_CARD_FRACTION:
        return None, red, blue
    return ("alive" if red >= blue else "dead"), red, blue


def score_row(image_data):
    """Decodes the stored JPEG and turns the color into the values the website shows."""
    bgr = cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("stored photo could not be decoded")
    label, red, blue = classify(bgr)
    share = f"red {red:.0%}, blue {blue:.0%} of the picture"
    if label == "alive":
        return dict(coral_type="Live coral (demo card)", health="healthy",
                    confidence=round(min(1.0, red / (red + blue)), 2),
                    reason=f"Red card detected ({share}).", verdict="demo_alive",
                    verdict_reason="LIVE DEMO: red means alive. Heat data is skipped for demo rows.")
    if label == "dead":
        return dict(coral_type="Dead coral (demo card)", health="dead_algae",
                    confidence=round(min(1.0, blue / (red + blue)), 2),
                    reason=f"Blue card detected ({share}).", verdict="demo_dead",
                    verdict_reason="LIVE DEMO: blue means dead. Heat data is skipped for demo rows.")
    return dict(coral_type="No card (demo)", health="not_coral", confidence=0.0,
                reason=f"No red or blue card found ({share}).", verdict="demo_unclear",
                verdict_reason="LIVE DEMO: no clear red or blue card in this picture.")


def process_demo_snapshots():
    from psycopg2.extras import RealDictCursor
    from database import connect
    import pause

    con = connect()
    cur = con.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT id, taken_at, image_data FROM snapshots WHERE status = 'new' AND trigger = %s",
                (DEMO_TRIGGER,))
    for row in cur.fetchall():
        if pause.is_paused():
            break
        try:
            if row["image_data"] is None:
                raise ValueError("no photo stored for this snapshot")
            s = score_row(bytes(row["image_data"]))
            cur.execute("""
                UPDATE snapshots
                SET coral_type = %s, health = %s, paleness = NULL, confidence = %s, reason = %s,
                    dhw = NULL, neighbor_count = NULL, neighbor_median = NULL,
                    verdict = %s, verdict_reason = %s, status = 'analyzed'
                WHERE id = %s AND taken_at = %s""",
                (s["coral_type"], s["health"], s["confidence"], s["reason"],
                 s["verdict"], s["verdict_reason"], row["id"], row["taken_at"]))
            con.commit()
            print(f"Demo snapshot {row['id']}: {s['verdict']} ({s['reason']})", flush=True)
        except Exception as e:
            con.rollback()
            cur.execute("UPDATE snapshots SET status = 'error', reason = %s WHERE id = %s AND taken_at = %s",
                        (str(e)[:200], row["id"], row["taken_at"]))
            con.commit()
            print(f"Demo snapshot {row['id']} failed:", e, flush=True)
    con.close()


if __name__ == "__main__":
    import pause
    from analyze import add_analysis_columns
    while True:                                    # make sure the verdict columns exist
        try:
            add_analysis_columns()
            break
        except Exception as e:
            print("Color demo: could not reach the database, retrying in 15 s:", e.__class__.__name__, flush=True)
            time.sleep(15)
    print("Color demo scorer running (red = alive, blue = dead). Press Ctrl+C to stop.")
    while True:
        pause.wait_while_paused("Color demo")
        try:
            process_demo_snapshots()
        except Exception as e:
            print("Color demo: could not reach the database, retrying in 15 s:", e.__class__.__name__, flush=True)
            time.sleep(15)
        time.sleep(2)
