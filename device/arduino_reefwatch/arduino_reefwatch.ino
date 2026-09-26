// ReefWatch (arduino_reefwatch): Grid-EYE temperature + record button + 16x2 screen on ONE Arduino.
// Replaces arduino_sensor + arduino_display. Plugs into the Pi by USB.
//
// Sends to the Pi once a second (and right away when the button is pressed):
//     {"temp_c":24.6,"recording":1}
// Sends "=== ReefWatch display ===" at startup so the Pi also uses this port for the screen.
// The Pi sends one line per screen row, about once a second:
//     1:Temp 24.6C
//     2:REC   Pics:12
// Until the Pi talks to it, the screen shows the temperature and REC/Paused by itself.
//
// Wiring (Arduino Uno):
//   Grid-EYE:  VIN -> 5V   GND -> GND   SDA -> A4   SCL -> A5
//   Button:    one leg -> pin 2, diagonal leg -> GND   (no resistor needed)
//   Screen, pins counted from pin 1 = VSS:
//     1 VSS -> GND        2 VDD -> 5V (must be 5 V)   3 V0 -> GND (or 1k-2.2k resistor to GND)
//     4 RS  -> pin 12     5 RW  -> GND                6 E  -> pin 11
//     7-10 (D0-D3) -> nothing
//     11 D4 -> pin 5      12 D5 -> pin 4      13 D6 -> pin 3     14 D7 -> pin 6
//     15 A  -> 5V through a 220 ohm resistor     16 K -> GND

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
bool piConnected = false;        // true after the first screen line from the Pi
float lastTemp = 0;
String incoming = "";
unsigned long lastChange = 0;
unsigned long lastReport = 0;
unsigned long lastRetry = 0;

void setTimeout() {
  Wire.setWireTimeout(25000, true);   // never freeze on a bad wire
}

bool startSensor() {
  bool ok = gridEye.begin(0x69) || gridEye.begin(0x68);
  setTimeout();
  return ok;
}

// One line of JSON for the Pi.
void sendStatus() {
  Serial.print("{\"temp_c\":");
  if (sensorReady) Serial.print(lastTemp, 1);
  else Serial.print("null");
  Serial.print(",\"recording\":");
  Serial.print(recording ? 1 : 0);
  Serial.println("}");
}

// Write one line, padded with spaces so old text is erased.
void showLine(int row, String text) {
  while (text.length() < 16) text += ' ';
  screen.setCursor(0, row);
  screen.print(text.substring(0, 16));
}

// Before the Pi connects, the screen shows what this board knows.
void showLocal() {
  showLine(0, sensorReady ? "Temp " + String(lastTemp, 1) + "C" : "Temp --");
  showLine(1, recording ? "REC   (no Pi)" : "Paused (no Pi)");
}

void handleLine(String line) {
  if (line.startsWith("1:")) {
    showLine(0, line.substring(2));
    piConnected = true;
  } else if (line.startsWith("2:")) {
    showLine(1, line.substring(2));
    piConnected = true;
  } else if (line.length() > 0) {
    showLine(0, line);                // typed in the Serial Monitor, for testing
  }
}

void setup() {
  Serial.begin(115200);
  screen.begin(16, 2);
  showLine(0, "ReefWatch");
  showLine(1, "Starting...");
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  Wire.begin();
  setTimeout();
  sensorReady = startSensor();
  delay(300);
  Serial.println("=== ReefWatch display ===");   // the Pi looks for this line
  Serial.println(sensorReady ? "Grid-EYE ready" : "Grid-EYE not found - will keep retrying");
}

void loop() {
  // ---- Button: each press flips recording on/off ----
  bool down = digitalRead(BUTTON_PIN) == LOW;
  if (down && !wasDown && millis() - lastChange > 200) {
    recording = !recording;
    lastChange = millis();
    sendStatus();                     // tell the Pi right away
    if (!piConnected) showLocal();
  }
  wasDown = down;

  // ---- Screen lines from the Pi (or the Serial Monitor) ----
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      handleLine(incoming);
      incoming = "";
    } else if (incoming.length() < 24) {
      incoming += c;
    }
  }

  // ---- Sensor missing: retry every 3 seconds ----
  if (!sensorReady && millis() - lastRetry >= 3000) {
    lastRetry = millis();
    sensorReady = startSensor();
  }

  // ---- Once a second: read temperature and report ----
  if (millis() - lastReport >= 1000) {
    lastReport = millis();
    if (sensorReady) {
      gridEye.readPixels(pixels);
      float total = 0;
      for (int i = 0; i < 64; i++) total += pixels[i];
      lastTemp = total / 64;
    }
    sendStatus();
    if (!piConnected) showLocal();
  }
}
