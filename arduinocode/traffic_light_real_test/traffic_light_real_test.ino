#include <Arduino.h>
#include <ArduinoJson.h>
#include <time.h>

#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecureBearSSL.h>

#include "certs.h"

#ifndef STASSID
#define STASSID "Test"
#define STAPSK  "11111111"
#endif

ESP8266WiFiMulti WiFiMulti;

#define PIN_GREEN  D1
#define PIN_YELLOW D2
#define PIN_RED    D3
#define PHOTO_PIN  A0

enum LightState { RED, RED_YELLOW, YELLOW, YELLOW_GREEN, GREEN };
const int NUM_STATES = 5;

enum SystemMode { MODE_RUNNING, MODE_WAIT_FOR_CYCLE_END, MODE_UPDATING, MODE_SAFETY };
SystemMode systemMode = MODE_RUNNING;

enum DiagMode {
  DIAG_NONE,
  DIAG_LEDS,
  DIAG_PHOTO,
  DIAG_WIFI,
  DIAG_FETCH,
  DIAG_JSON,
  DIAG_TIME,
  DIAG_PWM_LEVELS,
  DIAG_DIM_TOGGLE,
  DIAG_BLINK_DIM
};

DiagMode diagMode = DIAG_NONE;

float stateRatios[NUM_STATES] = { 0.2, 0.2, 0.2, 0.2, 0.2 };

float safetyStateRatios[NUM_STATES] = {
  0.3,
  0.0,
  0.4,
  0.0,
  0.3
};

unsigned long cycleLengthSec = 20;

int blinkStartMinutes = 22 * 60; // default 22:00
int blinkEndMinutes   = 7 * 60;  // default 07:00

const unsigned long SAFETY_CYCLE_LENGTH_SEC = 20;
const unsigned long DARK_TIME_REQUIRED   = 15000;
const unsigned long BRIGHT_TIME_REQUIRED = 15000;

const unsigned long FETCH_INTERVAL = 300000;

// Make blink visually obvious for testing purposes and to save battery
const unsigned long BLINK_INTERVAL = 500;

bool safetyModeEnabled = true;

const int DARK_ENTER = 850;
const int DARK_EXIT  = 750;

const int DAY_BRIGHTNESS   = 1023;
const int NIGHT_BRIGHTNESS = 250;

String apiurl = "https://script.google.com/macros/s/AKfycbzSBMtuJccPkmyGXEHG0rV0QvDhbFU6derWvsV46hXF6_hOru6SecUz11oFXObRXGHs5g/exec?action=read&intersectionID=5";

const bool RUN_BOOT_TESTS = true;
const bool RUN_NETWORK_TESTS_ON_BOOT = true;
const unsigned long WIFI_TIMEOUT_MS = 30000;
const unsigned long NTP_TIMEOUT_MS  = 15000;

int g_lastHttpCode = 0;
int g_lastPayloadLen = 0;
unsigned long g_wifiConnectMs = 0;

String g_lastFinalUrl = "";
String g_lastHttpsError = "";
unsigned long g_lastFetchMs = 0;

unsigned long cycleLengthMs = 0;
unsigned long stateDurations[NUM_STATES] = {0};
unsigned long safetyStateDurations[NUM_STATES] = {0};

LightState currentState = RED;
unsigned long stateStartMillis = 0;

unsigned long darkStartMillis = 0;
unsigned long brightStartMillis = 0;
bool isDarkConfirmed = false;

unsigned long lastFetchCheck = 0;

unsigned long lastBlinkToggle = 0;
bool yellowBlinkState = false;

unsigned long fakeDayStartMillis = 0;
const unsigned long DAY_MS = 24UL * 60UL * 60UL * 1000UL;

void initPins();
void setLights(bool red, bool yellow, bool green);
void applyLightsForState(LightState state);

void connectWiFiBlocking();
bool connectWiFiWithTimeout(unsigned long timeoutMs);

void setupTimeNTP();
bool waitForNtpTime(unsigned long timeoutMs);

String httpsFetch(const String& url);
void dumpFetchResult(const String& payload, size_t maxBytes = 800);

bool parseJsonConfig(const String& json);

void computeDurations();
void computeSafetyDurations();

bool updateLightSensor();

bool shouldEnterSafetyMode();
bool shouldExitSafetyMode();

int getMinutesOfDay();
bool isInBlinkWindow();
void runYellowBlink();

void advanceStateWithDurations(unsigned long durations[]);

void runUpdateMode();
void runAppLoop();

void printDiagMenu();
void handleDiagInput();
void runDiagMode();

void bootSelfTest();

// numeric values are ALWAYS treated as minutes after midnight as per schema for ease of use
static int parseTimeToMinutes(JsonVariant v, int fallback) {
  if (v.isNull()) return fallback;

  if (v.is<int>() || v.is<long>() || v.is<float>() || v.is<double>()) {
    long x = v.as<long>();
    if (x >= 0 && x <= 1439) return (int)x;
    return fallback;
  }

  if (v.is<const char*>()) {
    String s = v.as<const char*>();
    s.trim();

    int colon = s.indexOf(':');
    if (colon > 0) {
      int hh = s.substring(0, colon).toInt();
      int mm = s.substring(colon + 1).toInt();
      if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) return hh * 60 + mm;
      return fallback;
    }

    long x = s.toInt();
    if (x >= 0 && x <= 1439) return (int)x;
  }

  return fallback;
}

void setup() {
  Serial.begin(115200);
  delay(50);

  analogWriteRange(1023);

  initPins();
  fakeDayStartMillis = millis();

  Serial.println();
  Serial.println("=== Boot ===");

  if (RUN_BOOT_TESTS) {
    bootSelfTest();
  }

  printDiagMenu();

  computeDurations();
  computeSafetyDurations();

  currentState = RED;
  stateStartMillis = millis();
  applyLightsForState(currentState);
}

void loop() {
  handleDiagInput();
  if (diagMode != DIAG_NONE) {
    runDiagMode();
    return;
  }
  runAppLoop();
}

void initPins() {
  pinMode(PIN_RED, OUTPUT);
  pinMode(PIN_YELLOW, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  setLights(false, false, false);
}

inline int currentBrightness() {
  return isDarkConfirmed ? NIGHT_BRIGHTNESS : DAY_BRIGHTNESS;
}

void setLights(bool red, bool yellow, bool green) {
  int b = currentBrightness();

  analogWrite(PIN_RED,    red    ? b : 0);
  analogWrite(PIN_YELLOW, yellow ? b : 0);
  analogWrite(PIN_GREEN,  green  ? b : 0);
}

void applyLightsForState(LightState state) {
  switch (state) {
    case RED:          setLights(true,  false, false); break;
    case RED_YELLOW:   setLights(true,  true,  false); break;
    case YELLOW:       setLights(false, true,  false); break;
    case YELLOW_GREEN: setLights(false, true,  true ); break;
    case GREEN:        setLights(false, false, true ); break;
  }
}

bool updateLightSensor() {
  if (!safetyModeEnabled) return false;

  bool prev = isDarkConfirmed;

  int v = analogRead(PHOTO_PIN);
  unsigned long now = millis();

  bool isDarkNow = isDarkConfirmed ? (v > DARK_EXIT) : (v > DARK_ENTER);

  if (isDarkNow) {
    brightStartMillis = 0;

    if (darkStartMillis == 0) {
      darkStartMillis = now;
    } else if (now - darkStartMillis >= DARK_TIME_REQUIRED) {
      isDarkConfirmed = true;
    }

  } else {
    darkStartMillis = 0;

    if (brightStartMillis == 0) {
      brightStartMillis = now;
    } else if (now - brightStartMillis >= BRIGHT_TIME_REQUIRED) {
      isDarkConfirmed = false;
    }
  }

  return (prev != isDarkConfirmed);
}

bool shouldEnterSafetyMode() { return safetyModeEnabled && isDarkConfirmed; }
bool shouldExitSafetyMode()  { return safetyModeEnabled && !isDarkConfirmed; }

void connectWiFiBlocking() {
  WiFi.mode(WIFI_STA);
  WiFiMulti.addAP(STASSID, STAPSK);

  Serial.printf("Connecting WiFi: %s\n", STASSID);
  while (WiFiMulti.run() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("WiFi OK, IP: ");
  Serial.println(WiFi.localIP());
}

bool connectWiFiWithTimeout(unsigned long timeoutMs) {
  WiFi.mode(WIFI_STA);
  WiFiMulti.addAP(STASSID, STAPSK);

  Serial.printf("Connecting WiFi (timeout %lums): %s\n", timeoutMs, STASSID);
  unsigned long start = millis();
  while (WiFiMulti.run() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
    if (millis() - start >= timeoutMs) {
      Serial.println();
      Serial.println("WiFi connect timed out.");
      g_wifiConnectMs = millis() - start;
      return false;
    }
  }
  Serial.println();
  Serial.print("WiFi OK, IP: ");
  Serial.println(WiFi.localIP());
  g_wifiConnectMs = millis() - start;
  return true;
}

void setupTimeNTP() {
  // Estonia (Europe/Tallinn) timezone with DST rules.
  // If your server's BlinkStart/BlinkEnd are "local minutes after midnight",
  // remember to replace with google script time server
  setenv("TZ", "EET-2EEST,M3.5.0/3,M10.5.0/4", 1);
  tzset();

  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.println("NTP started (TZ set; localtime_r should be local)");
}

bool waitForNtpTime(unsigned long timeoutMs) {
  unsigned long start = millis();
  while (true) {
    time_t now = time(nullptr);
    if (now >= 1700000000) {
      Serial.println("NTP time is ready.");
      return true;
    }
    if (millis() - start >= timeoutMs) {
      Serial.println("NTP wait timed out.");
      return false;
    }
    delay(250);
    Serial.print("#");
  }
}

void dumpFetchResult(const String& payload, size_t maxBytes) {
  Serial.printf("[HTTPS] final_url=%s\n", g_lastFinalUrl.c_str());
  Serial.printf("[HTTPS] code=%d len=%d time=%lums\n", g_lastHttpCode, g_lastPayloadLen, g_lastFetchMs);

  if (g_lastHttpCode <= 0) {
    Serial.printf("[HTTPS] error=%s\n", g_lastHttpsError.c_str());
    return;
  }

  Serial.println("--- PAYLOAD START ---");
  if (payload.length() <= (int)maxBytes) {
    Serial.println(payload);
  } else {
    Serial.print(payload.substring(0, maxBytes));
    Serial.println();
    Serial.printf("[HTTPS] (truncated, total=%d bytes)\n", payload.length());
  }
  Serial.println("--- PAYLOAD END ---");
}

String httpsFetch(const String& url) {
  String payload = "";

  g_lastHttpCode = 0;
  g_lastPayloadLen = 0;
  g_lastHttpsError = "";
  g_lastFinalUrl = url;

  unsigned long t0 = millis();

  if (WiFiMulti.run() != WL_CONNECTED) {
    g_lastHttpsError = "WiFi not connected";
    Serial.println("WiFi not connected (fetch aborted)");
    g_lastFetchMs = millis() - t0;
    return payload;
  }

  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure);
  client->setInsecure();
  client->setTimeout(20000);

  HTTPClient https;
  https.setTimeout(20000);
  https.setFollowRedirects(HTTPC_FORCE_FOLLOW_REDIRECTS);
  https.setRedirectLimit(5);

  String cur = url;

  for (int i = 0; i < 5; i++) {
    g_lastFinalUrl = cur;

    Serial.println("[HTTPS] begin...");
    if (!https.begin(*client, cur)) {
      Serial.println("[HTTPS] Unable to connect");
      g_lastHttpsError = "https.begin() failed";
      g_lastFetchMs = millis() - t0;
      return "";
    }

    Serial.println("[HTTPS] GET...");
    int code = https.GET();
    g_lastHttpCode = code;
    Serial.printf("[HTTPS] code: %d\n", code);

    if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
      String loc = https.getLocation();
      Serial.print("Redirect Location: ");
      Serial.println(loc);
      https.end();

      if (loc.length() == 0) {
        g_lastHttpsError = "redirect with empty Location";
        g_lastFetchMs = millis() - t0;
        return "";
      }

      cur = loc;
      continue;
    }

    if (code > 0) {
      payload = https.getString();
      g_lastPayloadLen = payload.length();
      Serial.printf("[HTTPS] payload len: %d\n", g_lastPayloadLen);
    } else {
      g_lastHttpsError = https.errorToString(code).c_str();
      Serial.printf("[HTTPS] failed: %s\n", g_lastHttpsError.c_str());
    }

    https.end();
    g_lastFetchMs = millis() - t0;
    return payload;
  }

  https.end();
  Serial.println("[HTTPS] redirect limit reached");
  g_lastHttpsError = "redirect limit reached";
  g_lastFetchMs = millis() - t0;
  return "";
}

bool parseJsonConfig(const String& json) {
  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, json);

  if (error) {
    Serial.printf("JSON parse failed: %s\n", error.c_str());
    return false;
  }
  if (!doc["success"].as<bool>()) {
    Serial.println("Server success=false");
    return false;
  }

  if (!doc["data"].is<JsonArray>()) {
    Serial.println("JSON format error: data is not an array");
    return false;
  }

  JsonArray arr = doc["data"].as<JsonArray>();
  if (arr.size() == 0) {
    Serial.println("JSON format error: data[] empty");
    return false;
  }

  JsonObject entry;
  for (JsonObject o : arr) {
    if ((o["IsMainTrafficLight"] | false) == true) { entry = o; break; }
  }
  if (entry.isNull()) entry = arr[0].as<JsonObject>();

  if (!entry["CycleData"].is<JsonObject>()) {
    Serial.println("JSON format error: missing CycleData object");
    return false;
  }
  JsonObject cycle = entry["CycleData"].as<JsonObject>();

  long newLen = cycle["Length"] | (long)cycleLengthSec;
  if (newLen > 0) cycleLengthSec = (unsigned long)newLen;

  stateRatios[RED]          = cycle["RedRatio"]         | stateRatios[RED];
  stateRatios[RED_YELLOW]   = cycle["RedYellowRatio"]   | stateRatios[RED_YELLOW];
  stateRatios[YELLOW]       = cycle["YellowRatio"]      | stateRatios[YELLOW];
  stateRatios[YELLOW_GREEN] = cycle["GreenYellowRatio"] | stateRatios[YELLOW_GREEN];
  stateRatios[GREEN]        = cycle["GreenRatio"]       | stateRatios[GREEN];

  blinkStartMinutes = constrain(parseTimeToMinutes(cycle["BlinkStart"], blinkStartMinutes), 0, 1439);
  blinkEndMinutes   = constrain(parseTimeToMinutes(cycle["BlinkEnd"],   blinkEndMinutes),   0, 1439);

  Serial.println("JSON config applied");
  Serial.printf("Applied: cycleLengthSec=%lu\n", cycleLengthSec);
  Serial.printf("Applied ratios: R=%.3f RY=%.3f Y=%.3f YG=%.3f G=%.3f\n",
                stateRatios[RED], stateRatios[RED_YELLOW], stateRatios[YELLOW],
                stateRatios[YELLOW_GREEN], stateRatios[GREEN]);
  Serial.printf("Blink window applied: start=%d end=%d\n", blinkStartMinutes, blinkEndMinutes);

  return true;
}

void computeDurations() {
  cycleLengthMs = cycleLengthSec * 1000UL;
  for (int i = 0; i < NUM_STATES; i++) {
    stateDurations[i] = (unsigned long)(cycleLengthMs * stateRatios[i]);
    if (stateDurations[i] == 0) stateDurations[i] = 1;
  }
}

void computeSafetyDurations() {
  unsigned long safetyMs = SAFETY_CYCLE_LENGTH_SEC * 1000UL;
  for (int i = 0; i < NUM_STATES; i++) {
    safetyStateDurations[i] = (unsigned long)(safetyMs * safetyStateRatios[i]);
    if (safetyStateDurations[i] == 0) safetyStateDurations[i] = 1;
  }
}

void advanceStateWithDurations(unsigned long durations[]) {
  unsigned long now = millis();
  while (now - stateStartMillis >= durations[currentState]) {
    stateStartMillis += durations[currentState];
    currentState = (LightState)((currentState + 1) % NUM_STATES);
    applyLightsForState(currentState);
  }
}

int getMinutesOfDay() {
  time_t now = time(nullptr);
  if (now < 1700000000) {
    unsigned long elapsed = (millis() - fakeDayStartMillis) % DAY_MS;
    return (int)(elapsed / 60000);
  }
  struct tm t;
  localtime_r(&now, &t);
  return t.tm_hour * 60 + t.tm_min;
}

bool isInBlinkWindow() {
  int nowMin = getMinutesOfDay();

  // normal window (e.g., 02:00..07:00)
  if (blinkStartMinutes < blinkEndMinutes) {
    return (nowMin >= blinkStartMinutes && nowMin < blinkEndMinutes);
  }

  // wrap-around window (e.g., 22:00..07:00)
  if (blinkStartMinutes > blinkEndMinutes) {
    return (nowMin >= blinkStartMinutes || nowMin < blinkEndMinutes);
  }

  return false;
}

void runYellowBlink() {
  unsigned long now = millis();
  if (now - lastBlinkToggle >= BLINK_INTERVAL) {
    lastBlinkToggle = now;
    yellowBlinkState = !yellowBlinkState;
    setLights(false, yellowBlinkState, false);
  }
}

void runUpdateMode() {
  setLights(false, true, false);
  Serial.println("Updating from server (yellow only)");

  String json = httpsFetch(apiurl);
  dumpFetchResult(json, 1200);

  if (json.length() > 0 && parseJsonConfig(json)) {
    computeDurations();
  } else {
    Serial.println("No/invalid JSON; keeping old config");
  }

  currentState = RED;
  stateStartMillis = millis();
  applyLightsForState(currentState);

  Serial.println("Update complete, cycle restarted");
}

void runAppLoop() {

  bool darkChanged = updateLightSensor();

  bool blinkNow = isInBlinkWindow();

  static bool lastBlinkNow = false;
  static unsigned long lastBlinkStatusPrint = 0;

  if (blinkNow && !lastBlinkNow) {

    Serial.printf(">>> ENTER BLINK WINDOW <<< now=%d start=%d end=%d mode=%d dark=%d\n", getMinutesOfDay(), blinkStartMinutes, blinkEndMinutes, (int)systemMode, (int)isDarkConfirmed);
    
    yellowBlinkState = false;
    lastBlinkToggle = 0;
    lastBlinkStatusPrint = 0;
  } else if (!blinkNow && lastBlinkNow) {

    Serial.printf("<<< EXIT BLINK WINDOW >>> now=%d mode=%d dark=%d\n", getMinutesOfDay(), (int)systemMode, (int)isDarkConfirmed);

    if (systemMode == MODE_UPDATING) setLights(false, true, false);
    else applyLightsForState(currentState);
  }
  lastBlinkNow = blinkNow;

  if (blinkNow) {
    
    unsigned long nowMs = millis();
    if (nowMs - lastBlinkStatusPrint >= 30000UL) {
      lastBlinkStatusPrint = nowMs;
      Serial.printf("[BLINK] now=%d start=%d end=%d mode=%d dark=%d\n", getMinutesOfDay(), blinkStartMinutes, blinkEndMinutes,(int)systemMode, (int)isDarkConfirmed);
    }

    if (darkChanged) setLights(false, yellowBlinkState, false);
    runYellowBlink();
    return; // blinking overrides everything else failsafe
  }

  if (darkChanged) {
    if (systemMode == MODE_UPDATING) setLights(false, true, false);
    else applyLightsForState(currentState);
  }

  if (systemMode == MODE_RUNNING && millis() - lastFetchCheck >= FETCH_INTERVAL) {
    lastFetchCheck = millis();
    systemMode = MODE_WAIT_FOR_CYCLE_END;
    Serial.println("Fetch requested, waiting for cycle end...");
  }

  switch (systemMode) {
    case MODE_RUNNING:
      advanceStateWithDurations(stateDurations);

      if (shouldEnterSafetyMode() && currentState == GREEN && (millis() - stateStartMillis) < 400) {
        Serial.println("Entering SAFETY MODE");
        systemMode = MODE_SAFETY;
        currentState = RED;
        stateStartMillis = millis();
        applyLightsForState(currentState);
      }
      break;

    case MODE_WAIT_FOR_CYCLE_END:
      advanceStateWithDurations(stateDurations);
      if (currentState == GREEN && (millis() - stateStartMillis) < 400) {
        systemMode = MODE_UPDATING;
        Serial.println("Cycle ended, entering update mode");
      }
      break;

    case MODE_UPDATING:
      runUpdateMode();
      systemMode = MODE_RUNNING;
      break;

    case MODE_SAFETY:
      advanceStateWithDurations(safetyStateDurations);

      if (shouldExitSafetyMode() && currentState == GREEN && (millis() - stateStartMillis) < 400) {
        Serial.println("Exiting SAFETY MODE");
        systemMode = MODE_RUNNING;
        currentState = RED;
        stateStartMillis = millis();
        applyLightsForState(currentState);
      }
      break;
  }
}

void printDiagMenu() {
  Serial.println("Diagnostics menu:");
  Serial.println("  1 = LED test (chase)");
  Serial.println("  2 = Photoresistor test (print A0 + darkConfirmed + brightness)");
  Serial.println("  3 = WiFi test (connect + IP)");
  Serial.println("  4 = HTTPS fetch test (print payload)");
  Serial.println("  5 = JSON parse test (fetch + apply + print settings)");
  Serial.println("  6 = Time/NTP test (show minutes-of-day + blink window)");
  Serial.println("  7 = PWM levels test (each LED at DAY then NIGHT brightness)");
  Serial.println("  8 = Dimming toggle test (hold GREEN on, toggle darkConfirmed)");
  Serial.println("  9 = Blink + dimming test (blink YELLOW, toggle darkConfirmed)");
  Serial.println("  0 = Run full app");
  Serial.println();
  Serial.println("Extra keys in tests 8/9: 'd'=force dark, 'l'=force light, 't'=toggle dark/light");
  Serial.println();
}

static void diagForceDarkKey(char c) {
  if (c == 'd') {
    isDarkConfirmed = true;
    Serial.println("[DIAG] forced darkConfirmed=1");
  } else if (c == 'l') {
    isDarkConfirmed = false;
    Serial.println("[DIAG] forced darkConfirmed=0");
  } else if (c == 't') {
    isDarkConfirmed = !isDarkConfirmed;
    Serial.printf("[DIAG] toggled darkConfirmed=%d\n", (int)isDarkConfirmed);
  }
}

void handleDiagInput() {
  if (!Serial.available()) return;

  char c = (char)Serial.read();
  if (c == '\n' || c == '\r') return;

  if (diagMode == DIAG_DIM_TOGGLE || diagMode == DIAG_BLINK_DIM) {
    if (c == 'd' || c == 'l' || c == 't') {
      diagForceDarkKey(c);
      return;
    }
  }

  switch (c) {
    case '1': diagMode = DIAG_LEDS;       Serial.println("DIAG: LED test"); break;
    case '2': diagMode = DIAG_PHOTO;      Serial.println("DIAG: PHOTO test"); break;
    case '3': diagMode = DIAG_WIFI;       Serial.println("DIAG: WIFI test"); break;
    case '4': diagMode = DIAG_FETCH;      Serial.println("DIAG: FETCH test"); break;
    case '5': diagMode = DIAG_JSON;       Serial.println("DIAG: JSON test"); break;
    case '6': diagMode = DIAG_TIME;       Serial.println("DIAG: TIME test"); break;
    case '7': diagMode = DIAG_PWM_LEVELS; Serial.println("DIAG: PWM levels test"); break;
    case '8': diagMode = DIAG_DIM_TOGGLE; Serial.println("DIAG: dimming toggle test (GREEN on)"); break;
    case '9': diagMode = DIAG_BLINK_DIM;  Serial.println("DIAG: blink + dimming test (YELLOW blinks)"); break;

    case '0':
      diagMode = DIAG_NONE;
      systemMode = MODE_RUNNING;
      lastFetchCheck = millis();
      computeDurations();
      computeSafetyDurations();
      currentState = RED;
      stateStartMillis = millis();
      applyLightsForState(currentState);
      Serial.println("Running full app.");
      break;

    default:
      Serial.println("Unknown key.");
      printDiagMenu();
      break;
  }
}

void runDiagMode() {
  static unsigned long last = 0;

  switch (diagMode) {
    case DIAG_LEDS: {
      if (millis() - last < 500) return;
      last = millis();
      static int step = 0;
      step = (step + 1) % 4;
      if (step == 0) setLights(true,  false, false);
      if (step == 1) setLights(false, true,  false);
      if (step == 2) setLights(false, false, true);
      if (step == 3) setLights(false, false, false);
      break;
    }

    case DIAG_PHOTO: {
      if (millis() - last < 200) return;
      last = millis();
      bool changed = updateLightSensor();
      int v = analogRead(PHOTO_PIN);
      Serial.printf("A0=%d  darkConfirmed=%d  changed=%d  enter=%d exit=%d  brightness=%d\n", v, (int)isDarkConfirmed, (int)changed, DARK_ENTER, DARK_EXIT, currentBrightness());
      break;
    }

    case DIAG_WIFI: {
      static bool done = false;
      if (!done) {
        connectWiFiBlocking();
        done = true;
      }
      break;
    }

    case DIAG_FETCH: {
      static bool done = false;
      if (!done) {
        connectWiFiBlocking();
        setupTimeNTP();
        String p = httpsFetch(apiurl);
        dumpFetchResult(p, 4000);
        done = true;
      }
      break;
    }

    case DIAG_JSON: {
      static bool done = false;
      if (!done) {
        connectWiFiBlocking();
        setupTimeNTP();
        String p = httpsFetch(apiurl);
        dumpFetchResult(p, 2000);

        if (p.length() && parseJsonConfig(p)) {
          computeDurations();
          Serial.printf("cycleLengthSec=%lu\n", cycleLengthSec);
          Serial.printf("ratios: R=%.3f RY=%.3f Y=%.3f YG=%.3f G=%.3f\n", stateRatios[RED], stateRatios[RED_YELLOW], stateRatios[YELLOW], stateRatios[YELLOW_GREEN], stateRatios[GREEN]);
          Serial.printf("blinkStart=%d  blinkEnd=%d\n", blinkStartMinutes, blinkEndMinutes);
        } else {
          Serial.println("JSON test failed (fetch/parse).");
        }
        done = true;
      }
      break;
    }

    case DIAG_TIME: {
      if (millis() - last < 1000) return;
      last = millis();
      int m = getMinutesOfDay();
      Serial.printf("minutesOfDay=%d  inBlinkWindow=%d  start=%d end=%d\n", m, (int)isInBlinkWindow(), blinkStartMinutes, blinkEndMinutes);
      break;
    }

    case DIAG_PWM_LEVELS: {
      if (millis() - last < 1000) return;
      last = millis();

      static int step = 0;
      step = (step + 1) % 7;

      switch (step) {
        case 0: isDarkConfirmed = false; Serial.println("[PWM] RED DAY");    setLights(true,  false, false); break;
        case 1: isDarkConfirmed = true;  Serial.println("[PWM] RED NIGHT");  setLights(true,  false, false); break;
        case 2: isDarkConfirmed = false; Serial.println("[PWM] Y DAY");      setLights(false, true,  false); break;
        case 3: isDarkConfirmed = true;  Serial.println("[PWM] Y NIGHT");    setLights(false, true,  false); break;
        case 4: isDarkConfirmed = false; Serial.println("[PWM] G DAY");      setLights(false, false, true ); break;
        case 5: isDarkConfirmed = true;  Serial.println("[PWM] G NIGHT");    setLights(false, false, true ); break;
        case 6: Serial.println("[PWM] OFF"); setLights(false, false, false); break;
      }
      break;
    }

    case DIAG_DIM_TOGGLE: {
      setLights(false, false, true);

      if (millis() - last < 3000) return;
      last = millis();

      isDarkConfirmed = !isDarkConfirmed;
      Serial.printf("[DIM] auto-toggle darkConfirmed=%d  brightness=%d\n", (int)isDarkConfirmed, currentBrightness());
      setLights(false, false, true);
      break;
    }

    case DIAG_BLINK_DIM: {
      unsigned long now = millis();

      if (now - lastBlinkToggle >= BLINK_INTERVAL) {
        lastBlinkToggle = now;
        yellowBlinkState = !yellowBlinkState;
        setLights(false, yellowBlinkState, false);
        Serial.printf("[BLINK] yellow=%d  darkConfirmed=%d  brightness=%d\n", (int)yellowBlinkState, (int)isDarkConfirmed, currentBrightness());
      }

      static unsigned long lastToggle = 0;
      if (lastToggle == 0) lastToggle = now;
      if (now - lastToggle >= 5000) {
        lastToggle = now;
        isDarkConfirmed = !isDarkConfirmed;
        Serial.printf("[BLINK] auto-toggle darkConfirmed=%d  brightness=%d\n", (int)isDarkConfirmed, currentBrightness());
        setLights(false, yellowBlinkState, false);
      }
      break;
    }

    default:
      break;
  }
}

void bootSelfTest() {
  Serial.println("=== BOOT SELF-TEST START ===");

  bool t_led_visual = true;
  bool t_photo_ok = false;
  bool t_pwm_visual = true;
  bool t_dim_ok = true;
  bool t_blink_ok = true;

  bool t_wifi_ok = false;
  bool t_ntp_ok  = false;
  bool t_https_ok = false;
  bool t_json_ok  = false;

  int photoMin = 1024;
  int photoMax = -1;

  bool savedDark = isDarkConfirmed;
  bool savedSafety = safetyModeEnabled;
  safetyModeEnabled = true;

  Serial.println("[BOOT] T1 LED chase (VISUAL)");
  for (int i = 0; i < 2; i++) {
    isDarkConfirmed = false;
    setLights(true,  false, false); delay(250);
    setLights(false, true,  false); delay(250);
    setLights(false, false, true ); delay(250);
    setLights(false, false, false); delay(250);
  }

  Serial.println("[BOOT] T2 Photo sensor range (5 samples)");
  for (int i = 0; i < 5; i++) {
    updateLightSensor();
    int v = analogRead(PHOTO_PIN);
    if (v < photoMin) photoMin = v;
    if (v > photoMax) photoMax = v;
    Serial.printf("[BOOT]   A0=%d darkConfirmed=%d brightness=%d\n", v, (int)isDarkConfirmed, currentBrightness());
    delay(200);
  }
  t_photo_ok = (photoMin >= 0 && photoMax <= 1023 && photoMax >= 0);

  Serial.printf("[BOOT] T3 PWM levels (VISUAL) DAY=%d NIGHT=%d\n", DAY_BRIGHTNESS, NIGHT_BRIGHTNESS);
  isDarkConfirmed = false; Serial.println("[BOOT][PWM] RED DAY");   setLights(true,false,false); delay(400);
  isDarkConfirmed = true;  Serial.println("[BOOT][PWM] RED NIGHT"); setLights(true,false,false); delay(400);
  isDarkConfirmed = false; Serial.println("[BOOT][PWM] Y DAY");     setLights(false,true,false); delay(400);
  isDarkConfirmed = true;  Serial.println("[BOOT][PWM] Y NIGHT");   setLights(false,true,false); delay(400);
  isDarkConfirmed = false; Serial.println("[BOOT][PWM] G DAY");     setLights(false,false,true); delay(400);
  isDarkConfirmed = true;  Serial.println("[BOOT][PWM] G NIGHT");   setLights(false,false,true); delay(400);
  setLights(false,false,false); delay(200);

  Serial.println("[BOOT] T4 Dimming toggle (GREEN stays ON)");
  isDarkConfirmed = false;
  setLights(false,false,true);
  for (int i = 0; i < 4; i++) {
    delay(500);
    isDarkConfirmed = !isDarkConfirmed;
    setLights(false,false,true);
    Serial.printf("[BOOT][DIM]   darkConfirmed=%d brightness=%d\n", (int)isDarkConfirmed, currentBrightness());
  }
  setLights(false,false,false); delay(200);

  Serial.println("[BOOT] T5 Blink + dim (YELLOW blinks, brightness flips once)");
  yellowBlinkState = false;
  lastBlinkToggle = millis();
  unsigned long startBlink = millis();
  unsigned long flipAt = startBlink + 2500;
  isDarkConfirmed = false;

  while (millis() - startBlink < 5500) {
    unsigned long now = millis();

    if (flipAt != 0 && now >= flipAt) {
      isDarkConfirmed = !isDarkConfirmed;
      Serial.printf("[BOOT][BLINK] brightness flip darkConfirmed=%d brightness=%d\n", (int)isDarkConfirmed, currentBrightness());
      setLights(false, yellowBlinkState, false);
      flipAt = 0;
    }

    if (now - lastBlinkToggle >= BLINK_INTERVAL) {
      lastBlinkToggle = now;
      yellowBlinkState = !yellowBlinkState;
      setLights(false, yellowBlinkState, false);
      Serial.printf("[BOOT][BLINK]   yellow=%d brightness=%d\n", (int)yellowBlinkState, currentBrightness());
    }
    delay(10);
  }
  setLights(false,false,false); delay(200);

  if (RUN_NETWORK_TESTS_ON_BOOT) {
    Serial.println("[BOOT] T6 Network (WiFi + NTP + HTTPS + JSON)");

    t_wifi_ok = connectWiFiWithTimeout(WIFI_TIMEOUT_MS);

    if (t_wifi_ok) {
      setupTimeNTP();
      t_ntp_ok = waitForNtpTime(NTP_TIMEOUT_MS);

      String p = httpsFetch(apiurl);
      dumpFetchResult(p, 1200);
      t_https_ok = (g_lastHttpCode > 0 && g_lastPayloadLen > 0);

      if (p.length() && parseJsonConfig(p)) {
        t_json_ok = true;
        computeDurations();
      }
    }
  }

  isDarkConfirmed = savedDark;
  safetyModeEnabled = savedSafety;
  setLights(false,false,false);

  Serial.println();
  Serial.println("=== BOOT SELF-TEST SUMMARY ===");
  Serial.printf("[T1] LED chase ............. %s (VISUAL)\n", t_led_visual ? "OK" : "FAIL");
  Serial.printf("[T2] Photo sensor range .... %s (min=%d max=%d)\n", t_photo_ok ? "OK" : "FAIL", photoMin, photoMax);
  Serial.printf("[T3] PWM day/night ......... %s (VISUAL)\n", t_pwm_visual ? "OK" : "FAIL");
  Serial.printf("[T4] Dimming toggle ........ %s\n", t_dim_ok ? "OK" : "FAIL");
  Serial.printf("[T5] Blink + dim ........... %s\n", t_blink_ok ? "OK" : "FAIL");

  if (RUN_NETWORK_TESTS_ON_BOOT) {
    Serial.printf("[T6] WiFi .................. %s (connect=%lums)\n", t_wifi_ok ? "OK" : "FAIL", g_wifiConnectMs);
    Serial.printf("[T7] NTP ................... %s\n", t_ntp_ok ? "OK" : "FAIL");
    Serial.printf("[T8] HTTPS fetch ........... %s (code=%d len=%d)\n", t_https_ok ? "OK" : "FAIL", g_lastHttpCode, g_lastPayloadLen);
    Serial.printf("[T9] JSON parse ............ %s\n", t_json_ok ? "OK" : "FAIL");
  } else {
    Serial.println("[T6-T9] Network tests ...... SKIPPED");
  }

  Serial.println("=== BOOT SELF-TEST END ===");
  Serial.println();
}
