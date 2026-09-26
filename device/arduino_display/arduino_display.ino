// Arduino 2 (arduino_display): 16x2 screen. Plugs into the Pi by USB.
//
// The Pi sends one line per screen row, about once a second:
//     1:Temp 24.6C
//     2:REC   Pics:12
// "1:" writes line 1, "2:" writes line 2. Any other text you type in the
// Serial Monitor (115200 baud, "Newline") goes to line 1, for testing.
// Until the Pi talks to it, line 2 counts seconds so you can see it's alive.
//
// Wiring (Arduino Uno), screen pins counted from pin 1 = VSS:
//   1 VSS -> GND        2 VDD -> 5V (must be 5 V)   3 V0 -> GND (or 1k-2.2k resistor to GND)
//   4 RS  -> pin 12     5 RW  -> GND                6 E  -> pin 11
//   7-10 (D0-D3) -> nothing
//   11 D4 -> pin 5      12 D5 -> pin 4      13 D6 -> pin 3     14 D7 -> pin 6
//   15 A  -> 5V through a 220 ohm resistor     16 K -> GND

#include <LiquidCrystal.h>

//                  RS  E  D4 D5 D6 D7
LiquidCrystal screen(12, 11, 5, 4, 3, 6);

String incoming = "";
bool piConnected = false;        // true after the first line from the Pi
unsigned long lastUpdate = 0;

// Write one line, padded with spaces so old text is erased.
void showLine(int row, String text) {
  while (text.length() < 16) text += ' ';
  screen.setCursor(0, row);
  screen.print(text.substring(0, 16));
}

void handleLine(String line) {
  if (line.startsWith("1:")) {
    showLine(0, line.substring(2));
    piConnected = true;
  } else if (line.startsWith("2:")) {
    showLine(1, line.substring(2));
    piConnected = true;
  } else if (line.length() > 0) {
    showLine(0, line);
  }
}

void setup() {
  Serial.begin(115200);
  screen.begin(16, 2);
  showLine(0, "ReefWatch");
  showLine(1, "Waiting for Pi");
  delay(300);
  Serial.println("=== ReefWatch display ===");   // the Pi looks for this line
}

void loop() {
  // ---- Lines from the Pi (or the Serial Monitor) ----
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      handleLine(incoming);
      incoming = "";
    } else if (incoming.length() < 24) {
      incoming += c;
    }
  }

  // ---- Before the Pi connects, line 2 counts seconds ----
  if (!piConnected && millis() - lastUpdate >= 1000) {
    lastUpdate = millis();
    showLine(1, "Running " + String(millis() / 1000) + " s");
  }
}
