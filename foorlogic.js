let foorifaas = 0;
let g = null;
let fooriaeg = 0;

const et = fooriEtapp();

let foorikoordinaadid = {
  punane: [100, "red"],
  kollane: [200, "yellow"],
  roheline: [300, "green"]
};


function updateAllFoorLights(etapp) {
  document.querySelectorAll(".wrapper").forEach(wrapper => {
    const lamps = {
      punane: wrapper.querySelector('.lamp[data-color="punane"]'),
      kollane: wrapper.querySelector('.lamp[data-color="kollane"]'),
      roheline: wrapper.querySelector('.lamp[data-color="roheline"]')
    };

    for (let key in lamps) {
      const el = lamps[key];
      if (!el) continue;
      el.classList.remove("on");
      el.style.background = foorikoordinaadid[key][1];
    }

    for (let lamp of etapp) {
      const el = lamps[lamp];
      if (el) el.classList.add("on");
    }
  });
}


function fooriEtapp() {
  if (!window.foorietapid || window.foorietapid.length === 0) return [];

  let v = foorietapid[0][1];

  for (let etapp of foorietapid) {
    if (foorifaas > etapp[0]) {
      v = etapp[1];
    }
  }

  return v;
}


function algus() {
  algusCommon();              
  g = c1.getContext("2d");

  kuvaAeg();
  setInterval(kuvaAeg, 1000);
}


function kuvaAeg() {
  let aeg = new Date(new Date().getTime() - nihe);

  kiht1.innerText = aeg.getHours() + ":" + aeg.getMinutes() + ":" + aeg.getSeconds();

  fooriaeg = (aeg - foorinihe) % kestus;
  kiht2.innerText = parseInt(fooriaeg);

  foorifaas = fooriaeg / kestus;
  kiht3.innerText = fooriEtapp();

  const mainFoor = fooriEtapp();
  const machineState = baseEtappToStateMachineState(mainFoor);

  currentState = machineState;

  const lampsForAll = getLampsFromStateMachine(currentState);
  updateLightsFromStateMachine(lampsForAll);
}

function kuvaFoor() {
  g.clearRect(0, 0, 200, 400);
}


function baseEtappToStateMachineState(etapp) {
  if (!window.serverResponse?.data) return "ALL_YELLOW";

  const masterDirection = getMasterDirection(window.serverResponse.data);

  const masterColor =
    etapp.includes("roheline") ? "Green" :
    etapp.includes("kollane") ? "Yellow" :
    "Red"
  ;

  return determineStateFromMaster(
    window.serverResponse.data,
    masterColor,
    masterDirection
  );
}


function getLampsFromStateMachine(stateName) {
  const st = intersectionStates?.[stateName];
  if (!st) return {};

  const out = {};

  for (const [dir, color] of Object.entries(st.lights)) {
    if (color === "Red") out[dir] = "punane";
    if (color === "Yellow") out[dir] = "kollane";
    if (color === "Green") out[dir] = "roheline";
  }

  return out;
}


function updateLightsFromStateMachine(mappedLights) {
  document.querySelectorAll(".wrapper").forEach(wrapper => {
    const direction = wrapper.dataset.direction;
    const lampColor = mappedLights[direction];

    const lamps = {
      punane: wrapper.querySelector('.lamp[data-color="punane"]'),
      kollane: wrapper.querySelector('.lamp[data-color="kollane"]'),
      roheline: wrapper.querySelector('.lamp[data-color="roheline"]')
    };

    for (let key in lamps) lamps[key].classList.remove("on");

    if (lampColor && lamps[lampColor]) {
      lamps[lampColor].classList.add("on");
    }
  });
}


function determineStateFromMaster(serverData, masterColor, masterDirection) {
  if (!serverData) return "ALL_YELLOW";
  if (!intersectionStates || !masterDirection) return "ALL_YELLOW";

  for (const [stateName, stateObj] of Object.entries(intersectionStates)) {
    if (stateObj.lights?.[masterDirection] === masterColor) {
      return stateName;
    }
  }

  for (const [stateName, stateObj] of Object.entries(intersectionStates)) {
    if (!stateObj.lights) continue;

    let count = 0;
    for (const val of Object.values(stateObj.lights)) {
      if (val === masterColor) count++;
    }

    if (count > 0 && stateObj.lights[masterDirection] === undefined) {
      return stateName;
    }
  }

  return "ALL_YELLOW";
}
