import base64
from google import genai
from pydantic import BaseModel


class CoralReport(BaseModel):
    is_coral: bool
    coral_type: str
    health: str
    paleness: int
    confidence: float
    reason: str


client = genai.Client()

with open("coral.jpeg", "rb") as f:
    photo_text = base64.b64encode(f.read()).decode("utf-8")

question = """You are a coral reef scientist. Look at this photo and fill in:
- is_coral: true if a coral is the main subject
- coral_type: common name (for example brain coral), or "unknown"
- health: one of healthy, pale, bleached, dead_algae
- paleness: whole number 1 to 6 (1 = dark and healthy, 6 = completely white)
- confidence: 0 to 1, how sure you are
- reason: one short sentence describing what you see"""

reply = client.interactions.create(
    model="gemini-3.8-flash",
    input=[
        {"type": "text", "text": question},
        {"type": "image", "data": photo_text, "mime_type": "image/jpeg"},
    ],
    response_format={
        "type": "text",
        "mime_type": "application/json",
        "schema": CoralReport.model_json_schema(),
    },
)

report = CoralReport.model_validate_json(reply.output_text)

print("Raw answer from Gemini:", reply.output_text)
print("Coral type:", report.coral_type)
print("Health:", report.health)
print("Paleness:", report.paleness, "out of 6")

if report.paleness >= 4:
    print("This coral looks stressed.")
else:
    print("This coral looks healthy.")