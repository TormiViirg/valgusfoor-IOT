let nihe = 0;
let kestus = 20000;
let foorinihe = 7000;
let foorifaas = 0;
let g = null;
const et = fooriEtapp();

window.foorietapid = [];

let foorikoordinaadid={
  "punane": [100, "red"],
  "kollane": [200, "yellow"],
  "roheline": [300, "green"]
}

const foorOffsets = {
  "foor-N": 0,       
  "foor-E": 5000,    
  "foor-S": 10000,   
  "foor-W": 15000    
};

function updateAllFoorLights(etapp){
  document.querySelectorAll('.wrapper').forEach(wrapper => {
    /*const offset = foorOffsets[wrapper.id] || 0;
    const faseTime = (fooriaeg + offset) % kestus;
    const et = fooriEtappForPhase(faseTime);*/

    const lamps = {
      punane:   wrapper.querySelector('.lamp[data-color="punane"]'),
      kollane:  wrapper.querySelector('.lamp[data-color="kollane"]'),
      roheline: wrapper.querySelector('.lamp[data-color="roheline"]')
    };

    for (let key in lamps){
      const el = lamps[key];
      if(!el) continue;
      el.classList.remove('on');
      el.style.background = foorikoordinaadid[key][1]; 
    }

    for (let lamp of etapp){
      const el = lamps[lamp];
      if(el) el.classList.add('on');
    }
  });
}


function fooriEtapp(){
  if (!window.foorietapid || window.foorietapid.length === 0) return [];
  let v = foorietapid[0][1];
  for(let etapp of foorietapid){
    if(foorifaas>etapp[0]){v=etapp[1]}
  }
  return v;
}


function algus(){
  fetch("https://script.google.com/macros/s/AKfycbxdq8ssXCLFLxr_-oP_ImA6GZ-fRQxilwQHu0cnx1vFhiVfGkqo8hNtQWaJVhi-aDW6/exec"
  ).then(d => d.text()).then(edasi);
  kysiKonf();		 
  setInterval(kysiKonf, 10000);
  g=c1.getContext("2d");
}


function edasi(d){
  console.log(d);
  nihe=new Date().getTime()-parseInt(d);
  console.log(nihe);
  kuvaAeg();
  setInterval(kuvaAeg, 1000);
}


function kysiKonf(){
  fetch("https://script.google.com/macros/s/AKfycbxV1OxeoNoeuYFW4RfOa3Ar2VDYTI6VjaWTEQwaSkPQAqxQttvqTap8HbvQ-onIgVF-nQ/exec?foorinr=1"
  ).then(d => d.json()).then(salvestaKonf);
}

function salvestaKonf(d){
  console.log(d);
  kestus=d[0]*1000;
  foorinihe=d[1]*1000;
}


function kuvaAeg(){
  let aeg=new Date(new Date().getTime()-nihe);
  kiht1.innerText=aeg.getHours()+":"+aeg.getMinutes()+":"+aeg.getSeconds();
  fooriaeg=((aeg-foorinihe) % kestus);
  kiht2.innerText=parseInt(fooriaeg);
  foorifaas=fooriaeg/kestus;
  kiht3.innerText=fooriEtapp();

  const mainFoor = fooriEtapp();
  const machineState = baseEtappToStateMachineState(mainFoor);

  currentState = machineState;

  const lampsForAll = getLampsFromStateMachine(currentState);
  kiht3.innerText = et;       
  updateLightsFromStateMachine(lampsForAll);
}


function kuvaFoor(){
  g.clearRect(0, 0, 200, 400);
}

function baseEtappToStateMachineState(etapp) {
  if (!window.serverResponse?.data) return "ALL_YELLOW";

  const masterDirection = getMasterDirection(window.serverResponse.data);

  const masterColor =
      etapp.includes("roheline") ? "Green" :
      etapp.includes("kollane") ? "Yellow" :
      "Red";

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
    if (color === "Red")    out[dir] = "punane";
    if (color === "Yellow") out[dir] = "kollane";
    if (color === "Green")  out[dir] = "roheline";
  }

  return out;
}

function updateLightsFromStateMachine(mappedLights) {
  document.querySelectorAll('.wrapper').forEach(wrapper => {

    const direction = wrapper.dataset.direction;
    const lampColor = mappedLights[direction];

    const lamps = {
      punane:   wrapper.querySelector('.lamp[data-color="punane"]'),
      kollane:  wrapper.querySelector('.lamp[data-color="kollane"]'),
      roheline: wrapper.querySelector('.lamp[data-color="roheline"]')
    };

    for (let key in lamps) lamps[key].classList.remove("on");

    if (lampColor && lamps[lampColor]) {
      lamps[lampColor].classList.add("on");
    }
  });
}


function determineStateFromMaster(serverData, masterColor, masterDirection) {
  if (!intersectionStates || !masterDirection) return "ALL_YELLOW";
  const color = masterColor;

  for (const [stateName, stateObj] of Object.entries(intersectionStates)) {
    if (stateObj.lights && stateObj.lights[masterDirection] === color) {
        return stateName;
    }
  }

  for (const [stateName, stateObj] of Object.entries(intersectionStates)) {
      if (!stateObj.lights) continue;

      let count = 0, total = 0;
      for (const val of Object.values(stateObj.lights)) {
        total++;
        if (val === color) count++;
      }
      if (count > 0 && (stateObj.lights[masterDirection] === undefined)) {
        return stateName;
      }
  }

  return "ALL_YELLOW";
}
