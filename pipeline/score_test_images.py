"""Asks Gemini to score each test photo ONCE and saves the answers to test_images/scores.json."""
import json
import os

from worker import ask_gemini

FOLDER = "test_images"
SCORES_FILE = os.path.join(FOLDER, "scores.json")

scores = {}
if os.path.exists(SCORES_FILE):
    with open(SCORES_FILE) as f:
        scores = json.load(f)

for name in sorted(os.listdir(FOLDER)):
    if not name.endswith(".jpeg") or name in scores:
        continue
    with open(os.path.join(FOLDER, name), "rb") as f:
        photo = f.read()
    try:
        report = ask_gemini(photo)
    except Exception as e:
        print(name, "failed:", e)
        continue
    scores[name] = report.model_dump()
    print(f"{name}: {report.health}, paleness {report.paleness}, {report.coral_type}")
    with open(SCORES_FILE, "w") as f:
        json.dump(scores, f, indent=2)

print(f"Done: {len(scores)} photos scored.")
