window.serverResponse = null;
window.feIntersectionId = 0;

const apiLink = "https://script.google.com/macros/s/AKfycbwp347_jkAWND-uTkNvrxgisa7k5EiiwceV6rdwYlQvDekaUzkpwMPTh_0BWt6iGzbY/exec"

let lightData = [];
let success = false;
let time = 0;
let messages = [];
const pollInMs = 10000;


function updateGridAreasCSSVar(data) {
  console.log("GRID VAR INPUT:", data);

  const root = document.documentElement;

  const updated = { N: false, E: false, S: false, W: false };

  data.forEach(item => {
    if (!item.CardinalDirection || !item.Tile) return;

    updated[item.CardinalDirection] = true;

    switch (item.CardinalDirection) {
      case "N": root.style.setProperty('--grid-N', item.Tile); break;
      case "E": root.style.setProperty('--grid-E', item.Tile); break;
      case "S": root.style.setProperty('--grid-S', item.Tile); break;
      case "W": root.style.setProperty('--grid-W', item.Tile); break;
    }
  });

  const fallbackTile = "1 / 1";

  if (!updated.N) root.style.setProperty('--grid-N', fallbackTile);
  if (!updated.E) root.style.setProperty('--grid-E', fallbackTile);
  if (!updated.S) root.style.setProperty('--grid-S', fallbackTile);
  if (!updated.W) root.style.setProperty('--grid-W', fallbackTile);
}


function buildFooriEtapidFromBackend(jsonData) {
  if (!jsonData.data || jsonData.data.length === 0) {
    console.warn("[FETCH] No cycle data; fallback to single yellow.");
    return [[0, ["kollane"]]];
  }

  const cycle = jsonData.data[0].CycleData || {};

  const stages = [];
  let current = 0;

  if (cycle.RedRatio > 0) stages.push([current, ["punane"]]);
  current += cycle.RedRatio;


  if (cycle.RedYellowRatio > 0) stages.push([current, ["punane", "kollane"]]);
  current += cycle.RedYellowRatio;


  if (cycle.GreenRatio > 0) stages.push([current, ["roheline"]]);
  current += cycle.GreenRatio;


  if (cycle.GreenYellowRatio > 0) stages.push([current, ["roheline", "kollane"]]);
  current += cycle.GreenYellowRatio;


  if (cycle.YellowRatio > 0) stages.push([current, ["kollane"]]);


  if (stages.length === 0) stages.push([0, ["punane"]]);

  return stages;
}


async function read(feIntersectionId) {

  const url = `${apiLink}?action=read&intersectionID=${feIntersectionId}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data) return null;

  window.serverResponse = data;

  updateIntersectionStateMachine();
  return data;
};


function getMasterDirection(serverData) {

  if (!Array.isArray(serverData) || serverData.length === 0) {
    console.warn("getMasterDirection: no server data");
    return null;
  }

  const main = serverData.find(d => d.IsMainTrafficLight === true);

  if (!main) {
    console.warn("No IsMainTrafficLight=true found; falling back to first entry if available");
    return serverData[0]?.CardinalDirection || null;
  }

  return main.CardinalDirection || null;
}

