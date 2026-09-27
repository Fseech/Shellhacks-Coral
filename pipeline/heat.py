import json
import os

import requests

CACHE_FILE = "heat_cache.json"
ERDDAP_URL = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/NOAA_DHW.json"


def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE) as f:
            return json.load(f)
    return {}


def save_cache(cache):
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2)


def get_dhw(lat, lon, day):
    """day looks like '2023-08-20'. Returns Degree Heating Weeks, or None if NOAA has no value."""
    lat = round(lat, 2)
    lon = round(lon, 2)
    key = f"{day},{lat},{lon}"

    cache = load_cache()
    if key in cache:
        return cache[key]

    query = f"CRW_DHW[({day}T12:00:00Z)][({lat})][({lon})]"
    response = requests.get(ERDDAP_URL + "?" + query, timeout=30)
    response.raise_for_status()
    rows = response.json()["table"]["rows"]
    value = rows[0][3] if rows else None

    cache[key] = value
    save_cache(cache)
    return value


def get_dhw_series(lat, lon, start_day, end_day, every_days=7):
    """Heat over time at one spot: a list of [day, dhw] pairs, one every `every_days` days."""
    lat = round(lat, 2)
    lon = round(lon, 2)
    key = f"series,{start_day},{end_day},{every_days},{lat},{lon}"

    cache = load_cache()
    if key in cache:
        return cache[key]

    query = (f"CRW_DHW[({start_day}T12:00:00Z):{every_days}:({end_day}T12:00:00Z)]"
             f"[({lat})][({lon})]")
    response = requests.get(ERDDAP_URL + "?" + query, timeout=60)
    response.raise_for_status()
    rows = response.json()["table"]["rows"]
    series = [[row[0][:10], row[3]] for row in rows]

    # also file each day separately, so get_dhw() finds them without asking NOAA again
    for day, value in series:
        cache[f"{day},{lat},{lon}"] = value
    cache[key] = series
    save_cache(cache)
    return series


if __name__ == "__main__":
    print("Looe Key, 2023-08-20:", get_dhw(24.55, -81.40, "2023-08-20"))
    print("Looe Key, 2023-06-01:", get_dhw(24.55, -81.40, "2023-06-01"))
