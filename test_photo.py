import base64
from google import genai
client = genai.Client()

with open("coral.jpeg", "rb") as f:
    photo_bytes = f.read()

photo_text = base64.b64encode(photo_bytes).decode("utf-8")
question = "Look at this coral. Is it healthy, pale, or bleached? Explain in one sentence."
reply = client.interactions.create(
    model="gemini-3.8-flash",
    input=[
        {"type": "text", "text": question},
        {"type": "image", "data": photo_text, "mime_type": "image/jpeg"},
    ],
)
print(reply.output_text)