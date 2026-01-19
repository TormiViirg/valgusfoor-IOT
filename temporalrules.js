let blinkTimer = null;
let blinkTimeout = null;
let blinkPending = false;

window.updateBlinkConfig = updateBlinkConfig;
window.startBlinkScheduler = startBlinkScheduler;
window.stopBlinkScheduler = stopBlinkScheduler;


function updateBlinkConfig(cleanedResponse) {
  if (!Array.isArray(cleanedResponse) || cleanedResponse.length === 0) {
    console.warn("updateBlinkConfig: no cleanedResponse");
    return false;
  }

  const cycle = cleanedResponse[0].CycleData;
  if (!cycle) {
    console.warn("updateBlinkConfig: no CycleData");
    return false;
  }

  const isValidMinute = v =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 1440;

  const start = isValidMinute(cycle.BlinkStart) ? cycle.BlinkStart : null;
  const end   = isValidMinute(cycle.BlinkEnd)   ? cycle.BlinkEnd   : null;

  window.blinkConfig = { start, end };

  if (start == null || end == null) {
    console.warn("Blink disabled: invalid start/end");
    return false;
  }

  return true;
}


function startBlinkScheduler() {
  if (blinkTimer || blinkTimeout || blinkPending) return;

  runBlinkCheck();
  scheduleNextMinuteTick();
}

function scheduleNextMinuteTick() {
  const now = getAuthoritativeMs();
  const delay = 60000 - (now % 60000);

  blinkPending = true;

  blinkTimeout = setTimeout(() => {
    blinkPending = false;

    runBlinkCheck();
    blinkTimer = setInterval(runBlinkCheck, 60000);
    blinkTimeout = null;
  }, delay);
}


function runBlinkCheck() {
  const { start, end } = window.blinkConfig || {};
  const active = determineTemporalSpecialRules(start, end);

  window.blinkActive = active;
  console.log("Blink active:", active);

  updateBlinkStatusUI();
}


function determineTemporalSpecialRules(start, end) {
  if (start == null || end == null) return false;

  const ms = getAuthoritativeMs();
  const d = new Date(ms);
  const minutesAfterMidnight = d.getHours() * 60 + d.getMinutes();

  // same-day window
  if (start <= end) {
    return minutesAfterMidnight >= start && minutesAfterMidnight < end;
  }

  // overnight window
  return minutesAfterMidnight >= start || minutesAfterMidnight < end;
}

function stopBlinkScheduler() {
  if (blinkTimer) {
    clearInterval(blinkTimer);
    blinkTimer = null;
  }

  if (blinkTimeout) {
    clearTimeout(blinkTimeout);
    blinkTimeout = null;
  }

  blinkPending = false;
  window.blinkActive = false;
}

function updateBlinkStatusUI() {
  const el = document.getElementById("blinkStatus");
  if (!el) return;

  el.textContent =
    "Blinking: " + (window.blinkActive ? "Active" : "Inactive");
}

updateBlinkStatusUI();
setInterval(updateBlinkStatusUI, 60000);