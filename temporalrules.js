let blinkTimer = null;
let blinkTimeout = null;
let blinkPending = false;

const machineType = typeof intersectionType !== "undefined" ? intersectionType : null;

const _overrideStack = [];
let _activeOverrideTimerId = null;
let _activeOverrideFor = null;

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
  whenSystemReady(() => {
    if (blinkTimer || blinkTimeout || blinkPending) return;
    runBlinkCheck();
    scheduleNextMinuteTick();
  });
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

    const machineType = 
        typeof intersectionType !== "undefined" && intersectionType !== null
        ? intersectionType 
        : "threeWay"
    ;

    const active = determineTemporalSpecialRules(start, end, machineType);

    window.blinkActive = active;
    console.log("Blink active:", active);

    updateBlinkStatusUI();
}


function determineTemporalSpecialRules(start, end, machineType) {

    if (start == null || end == null || !machineType) return false;

    const ms = getAuthoritativeMs();
    const d = new Date(ms);
    const minutesAfterMidnight = d.getHours() * 60 + d.getMinutes();

    let inWindow;
    if (start <= end) {
        inWindow = minutesAfterMidnight >= start && minutesAfterMidnight < end;
    } else {
        // overnight window
        inWindow = minutesAfterMidnight >= start || minutesAfterMidnight < end;
    }

    if (inWindow) {
        
        if (_activeOverrideFor !== machineType) {

            const remainingMinutes = minutesUntilWindowEnd(start, end, minutesAfterMidnight);

            const durationMs = (typeof remainingMinutes === "number" && remainingMinutes > 0)
              ? remainingMinutes * 60_000
              : 1000
            ;

            try {
              pushAllYellowOverride(machineType, durationMs);
            } catch (err) {
              console.error("Failed to pushAllYellowOverride:", err);
            }
        }
    } else {
        if (_activeOverrideFor === machineType) {
            popAllYellowOverride();
        }
    }

  return inWindow;
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


function deepClone(stateMachineRules) {
  // prefer structuredClone if available, otherwise fallback to JSON clone
    try {
        if (typeof structuredClone === "function") return structuredClone(stateMachineRules);
    } catch (e) { }
    return JSON.parse(JSON.stringify(stateMachineRules));
}


function pushAllYellowOverride(intersectionType, durationMs) {

    if (!window.__SYSTEM_READY__) {
        console.warn("Override blocked: system not ready");
        return;
    }

    const machine = window.stateMachines?.[intersectionType];
    if (!machine || !intersectionStates) {
        console.warn("Override blocked: missing machine/state");
        return;
    }

    const cloned = deepClone(machine);

    _overrideStack.push(deepClone(intersectionStates));

    intersectionStates = { ALL_YELLOW: cloned.ALL_YELLOW };
    currentState = "ALL_YELLOW";

    _activeOverrideFor = intersectionType;


    if (_activeOverrideTimerId) {
        clearTimeout(_activeOverrideTimerId);
        _activeOverrideTimerId = null;
    }


    if (typeof durationMs === "number" && durationMs > 0) {
        _activeOverrideTimerId = setTimeout(() => {
            popAllYellowOverride();
            _activeOverrideTimerId = null;
        }, durationMs);
    }
}


function popAllYellowOverride() {

    if (_overrideStack.length === 0) {
        _activeOverrideFor = null;
        if (_activeOverrideTimerId) { 
            clearTimeout(_activeOverrideTimerId);
            _activeOverrideTimerId = null; 
        }
        return;
    }

    intersectionStates = _overrideStack.pop();
    _activeOverrideFor = null;

    if (_activeOverrideTimerId) { 
        clearTimeout(_activeOverrideTimerId);
        _activeOverrideTimerId = null; 
    }
}


function minutesUntilWindowEnd(start, end, nowMinutes) {
  if (start <= end) {
    return Math.max(0, end - nowMinutes);
  } else {
    // overnight window
    if (nowMinutes >= start) return (24*60 - nowMinutes) + end;
    return end - nowMinutes;
  }
}


function updateBlinkStatusUI() {
  const el = document.getElementById("blinkStatus");
  if (!el) return;

  el.textContent =
    "Blinking: " + (window.blinkActive ? "Active" : "Inactive");
}

updateBlinkStatusUI();
setInterval(updateBlinkStatusUI, 60000);