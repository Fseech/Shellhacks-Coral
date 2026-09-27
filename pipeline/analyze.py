import math
import statistics
import time
from datetime import timezone

from psycopg2.extras import RealDictCursor

from database import connect
from heat import get_dhw

NEIGHBOR_RADIUS_M = 50   # corals within 50 meters count as neighbors
NEIGHBOR_DAYS = 7        # ...if they were photographed within 7 days of each other
MIN_NEIGHBORS = 2        # need at least 2 neighbors to compare
HIGH_HEAT = 4.0          # 4+ Degree Heating Weeks = bleaching expected
RESIST_GAP = 2           # must be 2+ paleness points darker than its neighbors


def add_analysis_columns():
    con = connect()
    cur = con.cursor()
    for column in ["dhw DOUBLE PRECISION",
                   "neighbor_count INTEGER",
                   "neighbor_median DOUBLE PRECISION",
                   "verdict TEXT",
                   "verdict_reason TEXT"]:
        cur.execute(f"ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS {column}")
    con.commit()
    con.close()


def distance_m(lat1, lon1, lat2, lon2):
    """Distance in meters between two GPS points (the haversine formula)."""
    r = 6371000
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def is_neighbor(row, other):
    if other["id"] == row["id"]:
        return False
    close = distance_m(row["lat"], row["lon"], other["lat"], other["lon"]) <= NEIGHBOR_RADIUS_M
    same_time = abs((row["taken_at"] - other["taken_at"]).days) <= NEIGHBOR_DAYS
    return close and same_time


def decide(row, neighbors, dhw):
    if row["health"] == "not_coral":
        return "not_coral", "No coral in view.", None
    if row["health"] == "dead_algae":
        return "dead_or_algae", "Dead skeleton covered in algae.", None
    if dhw is None:
        return "needs_more_data", "No heat data for this spot.", None
    if len(neighbors) < MIN_NEIGHBORS:
        return "needs_more_data", f"Only {len(neighbors)} neighbor(s) scanned so far.", None

    median = statistics.median(n["paleness"] for n in neighbors)
    own = row["paleness"]

    if dhw >= HIGH_HEAT and median - own >= RESIST_GAP:
        return ("resistant_candidate",
                f"Heat was high ({dhw} DHW) and its neighbors paled (median {median}/6), "
                f"but this coral stayed at {own}/6. Candidate for nursery testing.", median)
    if dhw < HIGH_HEAT and own >= 4 and median >= 4:
        return ("non_heat_stress",
                f"Heat was low ({dhw} DHW) but this patch is pale (median {median}/6). "
                f"Something besides heat may be wrong: check for sewage, runoff or disease.", median)
    return ("regular",
            f"Paleness {own}/6 fits its neighbors ({median}/6) and the heat ({dhw} DHW).", median)


def analyze_all():
    con = connect()
    cur = con.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT id, taken_at, lat, lon, health, paleness, verdict, dhw, neighbor_count, status
        FROM snapshots
        WHERE status IN ('scored', 'analyzed') AND paleness IS NOT NULL
    """)
    rows = cur.fetchall()

    living = [r for r in rows if r["health"] not in ("not_coral", "dead_algae")]

    for row in rows:
        neighbors = [n for n in living if is_neighbor(row, n)]

        day = row["taken_at"].astimezone(timezone.utc).date().isoformat()
        try:
            dhw = get_dhw(row["lat"], row["lon"], day)
        except Exception as e:
            print("   heat lookup failed:", e)
            dhw = None

        verdict, reason, median = decide(row, neighbors, dhw)

        unchanged = (row["status"] == "analyzed" and verdict == row["verdict"]
                     and len(neighbors) == row["neighbor_count"] and dhw == row["dhw"])
        if unchanged:
            continue   # nothing new for this coral, so skip the database write

        cur.execute("""
            UPDATE snapshots
            SET dhw = %s, neighbor_count = %s, neighbor_median = %s,
                verdict = %s, verdict_reason = %s, status = 'analyzed'
            WHERE id = %s AND taken_at = %s
        """, (dhw, len(neighbors), median, verdict, reason, row["id"], row["taken_at"]))

        if verdict != row["verdict"]:
            print(f"Snapshot {row['id']}: {verdict} -> {reason}")

    con.commit()
    con.close()


if __name__ == "__main__":
    add_analysis_columns()
    print("Analyzer running. Press Ctrl+C to stop.")
    while True:
        analyze_all()
        time.sleep(5)
