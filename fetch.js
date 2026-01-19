window.serverResponse = null;
window.feIntersectionId = 0;

const apiLink = "https://script.google.com/macros/s/AKfycbwp347_jkAWND-uTkNvrxgisa7k5EiiwceV6rdwYlQvDekaUzkpwMPTh_0BWt6iGzbY/exec"

let lightData = [];
let success = false;
let time = 0;
let messages = [];
const pollInMs = 10000;


async function read(feIntersectionId) {

  const url = `${apiLink}?action=read&intersectionID=${feIntersectionId}`;
  const res = await fetch(url);

  const response = await res.json();
  const cleanedResponse = response.data;

  if (!Array.isArray(cleanedResponse)) {
    throw new Error("Backend error: response.data is not an array");
  }

  window.serverResponse = cleanedResponse;

  updateIntersectionStateMachine(cleanedResponse);

  return { 
    response, 
    cleanedResponse 
  };
};


function updateGridAreasCSSVar(cleanedResponse) {
  if (!Array.isArray(cleanedResponse)) {
    throw new Error("updateGridAreasCSSVar expects cleanedResponse[] array");
  }

  const root = document.documentElement;

  const updated = { 
    N: false, 
    E: false, 
    S: false, 
    W: false 
  };

  cleanedResponse.forEach(cleanedResponse => {
    if (!cleanedResponse.CardinalDirection || !cleanedResponse.Tile) return;

    updated[cleanedResponse.CardinalDirection] = true;

    switch (cleanedResponse.CardinalDirection) {
      case "N": root.style.setProperty('--grid-N', cleanedResponse.Tile); break;
      case "E": root.style.setProperty('--grid-E', cleanedResponse.Tile); break;
      case "S": root.style.setProperty('--grid-S', cleanedResponse.Tile); break;
      case "W": root.style.setProperty('--grid-W', cleanedResponse.Tile); break;
    }
  });

  const fallbackTile = "1 / 1";

  if (!updated.N) root.style.setProperty('--grid-N', fallbackTile);
  if (!updated.E) root.style.setProperty('--grid-E', fallbackTile);
  if (!updated.S) root.style.setProperty('--grid-S', fallbackTile);
  if (!updated.W) root.style.setProperty('--grid-W', fallbackTile);
}


function buildFooriEtapidFromBackend(cleanedResponse) {

    if (!Array.isArray(cleanedResponse) || cleanedResponse.length === 0) {
    console.warn("No cleanedResponse; fallback to yellow");
    return [[0, ["kollane"]]];
  }

  const cycle = cleanedResponse[0].CycleData || {};

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

function getMasterDirection(cleanedResponse) {

  if (!Array.isArray(cleanedResponse) || cleanedResponse.length === 0) {
    console.warn("getMasterDirection: no server data");
    return null;
  }

  const main = cleanedResponse.find(d => d.IsMainTrafficLight === true);

  if (!main) {
    console.warn("No IsMainTrafficLight=true found; falling back to first entry if available");
    return cleanedResponse[0]?.CardinalDirection || null;
  }

  return main.CardinalDirection || null;
}

