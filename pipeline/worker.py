import base64
import time
import os

from google import genai
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from database import connect


class CoralReport(BaseModel):
    is_coral: bool
    coral_type: str
    health: str
    paleness: int
    confidence: float
    reason: str


QUESTION = """You are a coral reef scientist. Look at this photo and fill in:
- is_coral: true if a coral is the main subject
- coral_type: common name (for example brain coral), or "unknown"
- health: one of healthy, pale, bleached, dead_algae
- paleness: whole number 1 to 6 (1 = dark and healthy, 6 = completely white)
- confidence: 0 to 1, how sure you are
- reason: one short sentence describing only what you see. Do not guess the cause."""

client = genai.Client()


def ask_gemini(image_data):
    photo_text = base64.b64encode(image_data).decode("utf-8")

    reply = client.interactions.create(
        model=os.environ.get("GEMINI_MODEL", "gemini-3.8-flash"),
        input=[
            {"type": "text", "text": QUESTION},
            {"type": "image", "data": photo_text, "mime_type": "image/jpeg"},
        ],
        response_format={
            "type": "text",
            "mime_type": "application/json",
            "schema": CoralReport.model_json_schema(),
        },
    )
    return CoralReport.model_validate_json(reply.output_text)


def process_new_snapshots():
    con = connect()
    cur = con.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT id, taken_at, image_data FROM snapshots WHERE status = 'new'")
    rows = cur.fetchall()

    import pause
    for row in rows:
        if pause.is_paused():
            break                                  # paused mid-batch: the rest wait for "REC"
        print("Scoring snapshot", row["id"], "...")
        try:
            if row["image_data"] is None:
                raise ValueError("no photo stored for this snapshot")
            report = ask_gemini(bytes(row["image_data"]))
            health = report.health if report.is_coral else "not_coral"
            cur.execute(
                """UPDATE snapshots
                   SET coral_type = %s, health = %s, paleness = %s,
                       confidence = %s, reason = %s, status = 'scored'
                   WHERE id = %s AND taken_at = %s""",
                (report.coral_type, health, report.paleness,
                 report.confidence, report.reason, row["id"], row["taken_at"]),
            )
            con.commit()
            print("   ->", health, "| paleness", report.paleness, "|", report.reason)
        except Exception as e:
            con.rollback()
            cur.execute(
                "UPDATE snapshots SET status = 'error', reason = %s WHERE id = %s AND taken_at = %s",
                (str(e)[:200], row["id"], row["taken_at"]),
            )
            con.commit()
            print("   -> failed:", e)

    con.close()


if __name__ == "__main__":
    import pause
    print("AI worker running. Press Ctrl+C to stop.")
    while True:
        pause.wait_while_paused("AI worker")      # the ReefWatch button can pause scoring
        try:
            process_new_snapshots()
        except Exception as e:                     # e.g. database unreachable: wait and retry
            print("AI worker: could not reach the database, retrying in 15 s:", e.__class__.__name__, flush=True)
            time.sleep(15)
        time.sleep(3)