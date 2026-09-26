"""
capture.py - the ReefWatch device (runs on the Raspberry Pi).

  Arduino 1's button toggles recording ON / OFF. Arduino 2's screen shows temperature, REC and photo count.
  While ON: camera frames -> quick color check -> "significant" frame? -> save photo + metadata to outbox/
  uploader (background) -> sends outbox/ to Tiger Data, retries when offline -> moves to sent/
  Every saved photo gets: time, simulated location, depth, Grid-EYE temperature.

Run on the Pi:
    python3 capture.py                     # Pi Camera Module (or USB webcam if no Pi camera)
    python3 capture.py --usb               # force USB webcam
    python3 capture.py --video reef.mp4    # use a recorded reef video instead of the camera
    python3 capture.py --demo-date 2023-08-20   # stamp snapshots with this survey date (demo)
    python3 capture.py --always            # record without pressing the button (testing / no Arduino)
    python3 capture.py --no-upload         # save to outbox/ only, don't send to Tiger Data
"""
import argparse
import glob
import json
import math
import os
import shutil
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime, timezone

import cv2
import numpy as np

# ------------------------------------------------------------------ settings
DEVICE_ID = "reefcam-1"
SOFTWARE_VERSION = "0.3"
OUTBOX = "outbox"
SENT = "sent"

# Simulated GPS route (demo): start point + direction + boat speed.
# Real device: replace current_location() with a GPS module reading.
ROUTE_START = (24.5460, -81.4060)     # Looe Key, Florida Keys
ROUTE_HEADING_DEG = 45                # north-east
ROUTE_SPEED_M_S = 0.5                 # slow drift over the reef
DEFAULT_DEPTH_M = 4.0                 # entered by hand (no depth sensor)

# "Significant frame" filter
GRID = 8                    # split each frame into 8 x 8 blocks
MIN_CORAL_FRACTION = 0.30   # at least 30% of blocks must look like reef (not open water)
STANDOUT = 0.25             # a block this much paler/darker than the frame's typical block
SCENE_CHANGE = 18.0         # average pixel change (0-255) needed since the last snapshot
COOLDOWN_S = 3.0            # never save twice within this many seconds
# ---------------------------------------------------------------------------


def now_utc():
    return datetime.now(timezone.utc)


def clock_synced():
    """True if the Pi's clock was set from the internet (so timestamps are trustworthy)."""
    try:
        out = subprocess.run(["timedatectl", "show", "-p", "NTPSynchronized", "--value"],
                             capture_output=True, text=True, timeout=3)
        return out.stdout.strip() == "yes"
    except Exception:
        return None   # unknown (not a Pi / no timedatectl)


# ------------------------------------------------------------------ location
START_TIME = time.time()


def current_location():
    """Simulated boat position: moves from ROUTE_START along ROUTE_HEADING_DEG."""
    meters = (time.time() - START_TIME) * ROUTE_SPEED_M_S
    lat0, lon0 = ROUTE_START
    dlat = meters * math.cos(math.radians(ROUTE_HEADING_DEG)) / 111_320
    dlon = meters * math.sin(math.radians(ROUTE_HEADING_DEG)) / (111_320 * math.cos(math.radians(lat0)))
    return round(lat0 + dlat, 6), round(lon0 + dlon, 6), "simulated"


# ------------------------------------------------------------------ Arduinos
class Arduinos:
    """Talks to the two Arduinos over USB. Each one is recognized by what it sends.

    Arduino 1 (arduino_sensor)  -> Pi, once a second:   {"temp_c": 24.6, "recording": 1}
    Arduino 2 (arduino_display) -> Pi, at startup:      === ReefWatch display ===
    Pi -> Arduino 2, once a second:                     1:Temp 24.6C   and   2:REC   Pics:12
    """

    def __init__(self):
        self.temp_c = None
        self.recording = False
        self.last_seen = None
        self.sensor = None      # serial port of Arduino 1, once recognized
        self.display = None     # serial port of Arduino 2, once recognized
        self.ports = []
        try:
            import serial
            names = (glob.glob("/dev/ttyACM*") + glob.glob("/dev/ttyUSB*")          # Raspberry Pi / Linux
                     + glob.glob("/dev/cu.usbmodem*") + glob.glob("/dev/cu.usbserial*"))  # Mac (for testing)
            for name in sorted(names):
                port = serial.Serial(name, 115200, timeout=1)
                self.ports.append(port)
                threading.Thread(target=self._read_loop, args=(port,), daemon=True).start()
            if self.ports:
                time.sleep(3)   # each Arduino restarts when its port opens
        except Exception as e:
            print("Arduinos not available:", e)
        print("Arduino 1 (sensor + button):", self.sensor.port if self.sensor else "not found")
        print("Arduino 2 (display):", self.display.port if self.display else "not found (fine for the all-in-one sketch)")

    def _read_loop(self, port):
        while True:
            try:
                line = port.readline().decode(errors="ignore").strip()
                if "ReefWatch display" in line:
                    self.display = port
                    continue
                if not line.startswith("{"):
                    continue          # ignore other human-readable lines
                data = json.loads(line)
                self.sensor = port
                self.temp_c = data.get("temp_c")          # None if the Grid-EYE isn't found
                recording = data.get("recording") == 1
                if recording != self.recording:
                    print(">>> Recording ON" if recording else ">>> Recording OFF")
                self.recording = recording
                self.last_seen = time.time()
            except Exception:
                time.sleep(0.5)

    def show(self, line1, line2, saved):
        """Updates the screen: Arduino 2's lines, or the photo count for an all-in-one Arduino."""
        try:
            if self.display:
                self.display.write(f"1:{line1[:16]}\n2:{line2[:16]}\n".encode())
            elif self.sensor:
                self.sensor.write(f"C{saved}\n".encode())   # all-in-one sketch shows this count
        except Exception:
            pass


# ------------------------------------------------------------------ the filter
def frame_stats(frame):
    """Shrinks the frame to a GRID x GRID color summary and measures it."""
    small = cv2.resize(frame, (GRID, GRID), interpolation=cv2.INTER_AREA)
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV).astype(np.float32)
    hue, sat, val = hsv[..., 0], hsv[..., 1] / 255, hsv[..., 2] / 255
    open_water = (hue > 85) & (hue < 130) & (sat > 0.35)       # strongly blue blocks
    reef = ~open_water
    whiteness = val * (1 - sat)                                  # bleached = bright + colorless
    typical = float(np.median(whiteness[reef])) if reef.any() else 0.0
    standout = float(np.max(np.abs(whiteness[reef] - typical))) if reef.any() else 0.0
    return {
        "coral_fraction": round(float(reef.mean()), 3),
        "standout": round(standout, 3),
        "typical_whiteness": round(typical, 3),
    }


def scene_change(frame, last_small):
    small = cv2.resize(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), (64, 48))
    if last_small is None:
        return 255.0, small
    return float(np.mean(cv2.absdiff(small, last_small))), small


# ------------------------------------------------------------------ saving
def save_snapshot(frame, trigger, stats, arduino, args):
    """Saves the photo + ALL metadata to the outbox at the moment of capture."""
    captured = now_utc()
    lat, lon, loc_source = current_location()
    taken_at = captured
    if args.demo_date:
        d = datetime.fromisoformat(args.demo_date)
        taken_at = captured.replace(year=d.year, month=d.month, day=d.day)

    snap_id = f"{captured.strftime('%Y%m%dT%H%M%S')}_{uuid.uuid4().hex[:6]}"
    image_path = os.path.join(OUTBOX, snap_id + ".jpeg")
    cv2.imwrite(image_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    h, w = frame.shape[:2]
    meta = {
        "snapshot_id": snap_id,
        "device_id": DEVICE_ID,
        "survey_id": args.survey_id,
        "taken_at": taken_at.isoformat(),
        "device_clock_utc": captured.isoformat(),
        "clock_synced": clock_synced(),
        "lat": lat, "lon": lon, "location_source": loc_source,
        "depth_m": args.depth, "depth_source": "manual",
        "temp_c": arduino.temp_c,
        "temp_source": "Grid-EYE AMG8833 (infrared, surface reading)" if arduino.temp_c is not None else None,
        "trigger": trigger,                    # "auto" = picked by the filter while recording
        "filter": stats,
        "image_width": w, "image_height": h,
        "demo_date_used": bool(args.demo_date),
        "software_version": SOFTWARE_VERSION,
    }
    with open(os.path.join(OUTBOX, snap_id + ".json"), "w") as f:
        json.dump(meta, f, indent=2)
    print(f"Saved {snap_id} ({trigger}) at {lat},{lon}  temp={arduino.temp_c}")
    return snap_id


# ------------------------------------------------------------------ uploading
def upload_loop(arduino):
    """Every few seconds: send whatever is in the outbox. If offline, keep it and try again."""
    # database.py lives next to this file on the Pi, or two folders up in the repo
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
    from database import connect
    import psycopg2
    while True:
        waiting = sorted(glob.glob(os.path.join(OUTBOX, "*.json")))
        if waiting:
            try:
                con = connect()
                cur = con.cursor()
                for meta_path in waiting:
                    with open(meta_path) as f:
                        meta = json.load(f)
                    image_path = meta_path[:-5] + ".jpeg"
                    with open(image_path, "rb") as f:
                        photo = f.read()
                    cur.execute("""
                        INSERT INTO snapshots (image_path, taken_at, lat, lon, image_data, device_id,
                                               depth_m, temp_c, trigger, survey_id, meta,
                                               is_test, test_note)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                        (os.path.basename(image_path), meta["taken_at"], meta["lat"], meta["lon"],
                         psycopg2.Binary(photo), meta["device_id"], meta["depth_m"],
                         meta["temp_c"], meta["trigger"], meta["survey_id"], json.dumps(meta),
                         meta["demo_date_used"] or meta["location_source"] == "simulated",
                         "live device demo (simulated location)" if meta["location_source"] == "simulated" else None))
                    con.commit()
                    shutil.move(meta_path, os.path.join(SENT, os.path.basename(meta_path)))
                    shutil.move(image_path, os.path.join(SENT, os.path.basename(image_path)))
                    print("Uploaded", meta["snapshot_id"])
                con.close()
            except Exception as e:
                print(f"Upload failed ({e.__class__.__name__}); {len(waiting)} snapshot(s) kept in outbox.")
                if e.__class__.__name__ == "UndefinedColumn":
                    print("  The table is missing device columns. On the laptop, run once:")
                    print('  python3 -c "import database; database.create_table()"')
        time.sleep(5)


# ------------------------------------------------------------------ camera
def open_camera(args):
    if args.video:
        cap = cv2.VideoCapture(args.video)
        return lambda: cap.read()[1]
    if not args.usb:
        try:
            from picamera2 import Picamera2
            cam = Picamera2()
            cam.configure(cam.create_video_configuration(main={"size": (1280, 720), "format": "RGB888"}))
            cam.start()
            print("Using Pi Camera Module")
            return lambda: cam.capture_array()   # RGB888 arrives in OpenCV's BGR order
        except Exception as e:
            print("Pi Camera not available, trying USB webcam:", e)
    cap = cv2.VideoCapture(0)
    print("Using USB webcam")
    return lambda: cap.read()[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--usb", action="store_true", help="use a USB webcam")
    parser.add_argument("--video", help="use a recorded video file instead of the camera")
    parser.add_argument("--demo-date", help="stamp snapshots with this date, e.g. 2023-08-20")
    parser.add_argument("--depth", type=float, default=DEFAULT_DEPTH_M, help="depth in meters")
    parser.add_argument("--survey-id", default=now_utc().strftime("survey-%Y%m%d-%H%M"))
    parser.add_argument("--no-upload", action="store_true", help="only save to the outbox")
    parser.add_argument("--always", action="store_true",
                        help="record all the time, no button needed (testing without the Arduino)")
    args = parser.parse_args()

    os.makedirs(OUTBOX, exist_ok=True)
    os.makedirs(SENT, exist_ok=True)
    synced = clock_synced()
    if synced is False:
        print("WARNING: the Pi's clock is not synced to the internet - timestamps may be wrong.")

    arduino = Arduinos()
    if not args.no_upload:
        threading.Thread(target=upload_loop, args=(arduino,), daemon=True).start()

    read_frame = open_camera(args)
    last_small, last_save, frames, saved, last_screen = None, 0.0, 0, 0, 0.0
    if args.always:
        print("Recording all the time (--always). Press Ctrl+C to stop.")
    elif arduino.sensor:
        print("Ready. Press the button on the breadboard to start/stop recording. Ctrl+C to quit.")
    else:
        print("No Arduino and no --always: nothing will be recorded. "
              "Plug in the Arduino, or run with --always to test the camera.")
    try:
        while True:
            frame = read_frame()
            if frame is None:
                if args.video:
                    print("Video finished.")
                    break
                print("Camera returned no image.")
                time.sleep(1)
                continue
            frames += 1
            stats = frame_stats(frame)
            change, small = scene_change(frame, last_small)
            now = time.time()

            recording = args.always or arduino.recording
            if (recording
                    and now - last_save > COOLDOWN_S
                    and stats["coral_fraction"] >= MIN_CORAL_FRACTION
                    and stats["standout"] >= STANDOUT
                    and change >= SCENE_CHANGE):
                save_snapshot(frame, "auto", stats, arduino, args)
                last_small, last_save = small, now
                saved += 1

            if now - last_screen >= 1:
                last_screen = now
                temp = f"{arduino.temp_c:.1f}C" if arduino.temp_c is not None else "--"
                arduino.show(f"Temp {temp}", f"{'REC   ' if recording else 'Paused'} Pics:{saved}", saved)

            if frames % 60 == 0:   # a status line every ~2 seconds, handy for tuning the filter
                print(f"frame {frames}: recording={'yes' if recording else 'no'} "
                      f"reef={stats['coral_fraction']} standout={stats['standout']} "
                      f"change={change:.0f} temp={arduino.temp_c} saved={saved}")
            if args.video:
                time.sleep(1 / 30)   # play recorded video at about real speed
    except KeyboardInterrupt:
        pass
    print("Stopped. Waiting 6 seconds for the last uploads...")
    time.sleep(6)


if __name__ == "__main__":
    main()
