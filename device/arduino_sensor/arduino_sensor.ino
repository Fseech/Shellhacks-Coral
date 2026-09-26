// Arduino 1 (arduino_sensor): Grid-EYE temperature + record button. Plugs into the Pi by USB.
//
// Sends to the Pi once a second (and right away when the button is pressed):
//     {"temp_c":24.6,"recording":1}
// device/pi/capture.py reads these lines and tags every photo with temp_c.
//
// Wiring (Arduino Uno):
//   Grid-EYE:  VIN -> 5V   GND -> GND   SDA -> A4   SCL -> A5
//   Button:    one leg -> pin 2, diagonal leg -> GND   (no resistor needed)

#include <Wire.h>
#include <Adafruit_AMG88xx.h>

Adafruit_AMG88xx gridEye;
float pixels[AMG88xx_PIXEL_ARRAY_SIZE];

const int BUTTON_PIN = 2;

bool sensorReady = false;
bool recording = false;
bool wasDown = false;
float lastTemp = 0;
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

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("=== ReefWatch sensor ===");
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  Wire.begin();
  setTimeout();
  sensorReady = startSensor();
  Serial.println(sensorReady ? "Grid-EYE ready" : "Grid-EYE not found - will keep retrying");
}

void loop() {
  // ---- Button: each press flips recording on/off ----
  bool down = digitalRead(BUTTON_PIN) == LOW;
  if (down && !wasDown && millis() - lastChange > 200) {
    recording = !recording;
    lastChange = millis();
    sendStatus();                     // tell the Pi right away
  }
  wasDown = down;

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
  }
}
