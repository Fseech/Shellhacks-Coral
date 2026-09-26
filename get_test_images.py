"""Downloads freely licensed coral photos from Wikimedia Commons for TEST DATA.
Saves them to test_images/ plus credits.csv (photographer + license for each photo)."""
import csv
import os
import re
import time

import cv2
import numpy as np
import requests

FOLDER = "test_images"
SEARCHES = ["bleached coral", "coral bleaching", "healthy coral reef",
            "coral reef fish", "dead coral", "coral rubble algae"]
PER_SEARCH = 12
API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {"User-Agent": "ReefWatch-ShellHacks-student-project/1.0 (educational hackathon demo)"}


def strip_html(text):
    return re.sub(r"<[^>]+>", "", text or "").strip()


def search(term):
    params = {
        "action": "query", "format": "json",
        "generator": "search", "gsrsearch": term, "gsrnamespace": "6", "gsrlimit": PER_SEARCH,
        "prop": "imageinfo", "iiprop": "url|mime|extmetadata", "iiurlwidth": "640",
    }
    response = requests.get(API, params=params, headers=HEADERS, timeout=30)
    response.raise_for_status()
    return list(response.json().get("query", {}).get("pages", {}).values())


def main():
    os.makedirs(FOLDER, exist_ok=True)
    credits = []
    seen = set()

    for term in SEARCHES:
        print(f"Searching Wikimedia Commons for '{term}' ...")
        for page in search(term):
            info = page.get("imageinfo", [{}])[0]
            meta = info.get("extmetadata", {})
            license_name = meta.get("LicenseShortName", {}).get("value", "")
            free = license_name.startswith("CC") or "public domain" in license_name.lower()
            if info.get("mime") != "image/jpeg" or not free or page["title"] in seen:
                continue
            seen.add(page["title"])

            data = requests.get(info.get("thumburl") or info["url"], headers=HEADERS, timeout=60).content
            img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
            if img is None:
                continue
            h, w = img.shape[:2]
            if w > 480:
                img = cv2.resize(img, (480, int(h * 480 / w)))   # keep photos small for the database

            name = f"img_{len(credits) + 1:03d}.jpeg"
            cv2.imwrite(os.path.join(FOLDER, name), img, [cv2.IMWRITE_JPEG_QUALITY, 75])
            credits.append({
                "file": name,
                "title": page["title"],
                "author": strip_html(meta.get("Artist", {}).get("value")),
                "license": license_name,
                "source": info.get("descriptionurl", ""),
            })
            print("   saved", name, "-", page["title"])
            time.sleep(0.5)   # be polite to Wikimedia's servers

    with open(os.path.join(FOLDER, "credits.csv"), "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["file", "title", "author", "license", "source"])
        writer.writeheader()
        writer.writerows(credits)
    print(f"Done: {len(credits)} photos saved to {FOLDER}/ (credits in {FOLDER}/credits.csv)")


if __name__ == "__main__":
    main()
