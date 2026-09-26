# ReefWatch — Raspberry Pi setup

The Pi runs the camera. Two Arduinos plug into the Pi by USB: Arduino 1 has the Grid-EYE temperature sensor and the record button, Arduino 2 has the 16x2 screen.

```
[Button + Grid-EYE] -> Arduino 1 --USB--> Raspberry Pi + camera --Wi-Fi--> Tiger Data --> dashboard (laptop)
                                  Arduino 2 (screen) <--USB--/
```

Press the button once to start recording and press it again to stop. While recording, the Pi saves only the "interesting" frames. Each saved photo gets these tags:
- time
- location (a simulated boat route for the demo)
- depth
- Grid-EYE temperature

## Files on the Pi (put them together in `~/reef`)

| File | What it does |
|---|---|
| `device/pi/capture.py` | The main program: camera, record on/off, saving photos and metadata, uploading, updating the screen |
| `database.py` (repo root) | Connects to Tiger Data (`capture.py` uses it) |
| `device/arduino_sensor/arduino_sensor.ino` | Goes on **Arduino 1** (uploaded from a laptop with Arduino IDE), not the Pi |
| `device/arduino_display/arduino_display.ino` | Goes on **Arduino 2** |

## 1. Flash the SD card (Raspberry Pi Imager)
Open the settings (gear icon, or "Edit Settings") and set:
- **Hostname:** `reefcam-1`
- **Username and password:** pick them and write them down.
- **Wi-Fi:** the phone hotspot's name and password.
- **Services tab:** turn on **SSH**.

## 2. Log in from a laptop on the same hotspot
```bash
ssh yourusername@reefcam-1.local
```

## 3. Install what the code needs (on the Pi)
```bash
sudo apt update
sudo apt install -y python3-opencv python3-numpy python3-serial python3-psycopg2 python3-picamera2
```

## 4. Add the database password (on the Pi)
Get the Tiger Data connection string from Jay **privately**. Never put it in code, chat or GitHub.
```bash
nano ~/.bashrc
```
Add this line at the bottom, save (Ctrl+O, Enter), and exit (Ctrl+X):
```bash
export DATABASE_URL="postgres://...the string from Jay..."
```
Then run `source ~/.bashrc`.

## 5. Copy the files over (run from the laptop, inside the repo folder `~/Desktop/reef`)
```bash
ssh yourusername@reefcam-1.local "mkdir -p ~/reef"
scp device/pi/capture.py database.py yourusername@reefcam-1.local:~/reef/
```

## 6. Check the clock is right
The Pi has no battery clock, so it sets the time from the internet when it connects to the hotspot.
```bash
timedatectl
```
Look for `System clock synchronized: yes`. If it says no, wait a minute on the hotspot and check again.

## 7. Run it
```bash
cd ~/reef
python3 capture.py --no-upload --always     # camera test: no Arduino, no database needed
python3 capture.py                          # the real thing: button starts/stops recording
```
Useful options:
- `--usb` uses a USB webcam instead of the Pi Camera Module.
- `--video reef.mp4` uses a recorded video instead of the camera.
- `--demo-date 2023-08-20` stamps photos with a past survey date, so they line up with real NOAA heat data.
- `--depth 6` sets the depth in meters (the default is 4).
- `--no-upload` saves to `outbox/` only.
- `--always` records without the button.

Stop it with **Ctrl+C**.

## What you'll see
```
Arduino 1 (sensor + button): /dev/ttyACM0
Arduino 2 (display): /dev/ttyACM1
Ready. Press the button on the breadboard to start/stop recording.
>>> Recording ON
Saved 20260926T153318_ffc728 (auto) at 24.546011,-81.405988  temp=27.3
Uploaded 20260926T153318_ffc728
>>> Recording OFF
```
- Photos wait in `outbox/`. They move to `sent/` once they've been uploaded.
- If the Wi-Fi drops, they stay in `outbox/` and upload automatically when it comes back.
- Every photo has a matching `.json` file with all its tags.

## Troubleshooting
- **"Arduino 1 ... not found" or "Arduino 2 ... not found":** check its USB cable, then run `ls /dev/ttyACM*` (you should see two). If you get "permission denied", run `sudo usermod -aG dialout $USER`, then log out and back in.
- **`temp=None`:** Arduino 1 can't see the Grid-EYE. Check its 4 wires.
- **Screen stuck on "Waiting for Pi":** capture.py didn't recognize Arduino 2. Unplug and replug it, then restart capture.py.
- **"The table is missing device columns":** run `python3 -c "import database; database.create_table()"` once on the laptop, in `~/Desktop/reef` (it adds `temp_c`, `depth_m` and the other device columns).
- **Nothing saves while recording:** the filter only keeps frames that look like reef and have changed since the last photo. Point the camera at something colorful and move it. The `frame ...` status lines show the filter numbers.
- **"Upload failed":** check the hotspot, and check that `echo $DATABASE_URL` prints something.
