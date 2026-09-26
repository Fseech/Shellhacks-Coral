// All-in-one (arduino_all_in_one): Grid-EYE + record button + 16x2 screen on ONE Arduino.
// Use this instead of arduino_sensor + arduino_display when everything is on one breadboard.
//
// Screen shows:   Temp: 24.6 C
//                 REC    Pics:12
//
// Sends to the Pi once a second (and right away when the button is pressed):
//     {"temp_c":24.6,"recording":1}
// Receives from the Pi after each saved photo:
//     C12      (number of snapshots saved - shown on the screen)
//
// Wiring (Arduino Uno):
//   Arduino 5V -> breadboard + rail,  Arduino GND -> breadboard - rail
//   Grid-EYE:  VIN -> + rail   GND -> - rail   SDA -> A4   SCL -> A5
//   Button:    one leg -> pin 2, diagonal leg -> GND   (no resistor needed)
//   Screen (16 pins, counted from pin 1 = VSS):
//     1 VSS -> - rail     2 VDD -> + rail     3 V0 -> - rail (or 1k-2.2k resistor to - rail)
//     4 RS  -> pin 12     5 RW  -> - rail     6 E  -> pin 11
//     7-10 (D0-D3) -> nothing
//     11 D4 -> pin 5      12 D5 -> pin 4      13 D6 -> pin 3     14 D7 -> pin 6
//     15 A  -> + rail through a 220 ohm resistor     16 K -> - rail

#include <Wire.h>
#include <Adafruit_AMG88xx.h>
#include <LiquidCrystal.h>

Adafruit_AMG88xx gridEye;
float pixels[AMG88xx_PIXEL_ARRAY_SIZE];
//                  RS  E  D4 D5 D6 D7
LiquidCrystal screen(12, 11, 5, 4, 3, 6);

const int BUTTON_PIN = 2;

bool sensorReady = false;
bool recording = false;
bool wasDown = false;
float lastTemp = 0;
int snapshotCount = 0;
unsigned long lastChange = 0;
unsigned long lastReport = 0;
unsigned long lastRetry = 0;
unsigned long lastResync = 0;
String incoming = "";

void setTimeout() {
  Wire.setWireTimeout(25000, true);   // never freeze on a bad wire
}

bool startSensor() {
  bool ok = gridEye.begin(0x69) || gridEye.begin(0x68);
  setTimeout();
  return ok;
}

// Write one line, padded with spaces so old text is erased.
// Uses a fixed-size char buffer instead of String, which is easier on the Uno's 2 KB of memory.
void showLine(int row, const char* text) {
  char line[17];
  snprintf(line, sizeof(line), "%-16s", text);   // pad to exactly 16 characters
  screen.setCursor(0, row);
  screen.print(line);
}

void updateScreen() {
  char top[17];
  char bottom[17];
  if (sensorReady) {
    char t[8];
    dtostrf(lastTemp, 4, 1, t);                   // e.g. "24.6"
    snprintf(top, sizeof(top), "Temp: %s %cC", t, (char)223);   // 223 = degree sign
  } else {
    snprintf(top, sizeof(top), "Temp: no sensor");
  }
  snprintf(bottom, sizeof(bottom), "%s Pics:%d", recording ? "REC   " : "Paused", snapshotCount);
  showLine(0, top);
  showLine(1, bottom);
}

// Re-send the screen's start-up commands. If a glitch (loose wire, power dip) ever
// scrambles the screen into gibberish, this puts it back in step within a few seconds.
void resyncScreen() {
  screen.begin(16, 2);
  updateScreen();
}

// One line of JSON for the Pi. Lines that don't start with { are ignored by the Pi.
void sendStatus() {
  Serial.print("{\"temp_c\":");
  if (sensorReady) Serial.print(lastTemp, 1);
  else Serial.print("null");
  Serial.print(",\"recording\":");
  Serial.print(recording ? 1 : 0);
  Serial.println("}");
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("=== ReefWatch Arduino ===");
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  Wire.begin();
  setTimeout();

  delay(100);                         // give the screen time to power up
  screen.begin(16, 2);
  showLine(0, "ReefWatch");

  sensorReady = startSensor();
  Serial.println(sensorReady ? "Grid-EYE ready" : "Grid-EYE not found - will keep retrying");
  updateScreen();
}

void loop() {
  // ---- Button: each press flips recording on/off ----
  bool down = digitalRead(BUTTON_PIN) == LOW;
  if (down && !wasDown && millis() - lastChange > 200) {
    recording = !recording;
    lastChange = millis();
    sendStatus();                     // tell the Pi right away
    updateScreen();                   // and show it right away
  }
  wasDown = down;

  // ---- Messages from the Pi, e.g. "C12" ----
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      if (incoming.startsWith("C")) {
        int count = incoming.substring(1).toInt();
        if (count != snapshotCount) {     // only redraw when the number changes
          snapshotCount = count;
          updateScreen();
        }
      }
      incoming = "";
    } else if (c != '\r' && incoming.length() < 20) {
      incoming += c;
    }
  }

  // ---- Sensor missing: retry every 3 seconds ----
  if (!sensorReady && millis() - lastRetry >= 3000) {
    lastRetry = millis();
    sensorReady = startSensor();
  }

  // ---- Every 5 seconds: re-sync the screen in case a glitch scrambled it ----
  if (millis() - lastResync >= 5000) {
    lastResync = millis();
    resyncScreen();
  }

  // ---- Once a second: read temperature, report, refresh the screen ----
  if (millis() - lastReport >= 1000) {
    lastReport = millis();
    if (sensorReady) {
      gridEye.readPixels(pixels);
      float total = 0;
      for (int i = 0; i < 64; i++) total += pixels[i];
      lastTemp = total / 64;
    }
    sendStatus();
    updateScreen();
  }
}
