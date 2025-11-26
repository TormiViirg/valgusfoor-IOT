window.feIntersectionId = 0;
window.foorietapid = []; 
const apiLink = "https://script.google.com/macros/s/AKfycbwp347_jkAWND-uTkNvrxgisa7k5EiiwceV6rdwYlQvDekaUzkpwMPTh_0BWt6iGzbY/exec"

let lightData = [];
let success = false;
let time = 0;
let messages = [];

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
  const cycle = jsonData.data[0].CycleData;
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

  if (stages.length === 0) stages.push([0, ["punane"]]); // default
  return stages;
}


read(feIntersectionId).then(returnData => {
  if (returnData?.data) {
    updateGridAreasCSSVar(returnData.data);
    window.foorietapid = buildFooriEtapidFromBackend(returnData);
  }
});


async function fetchData(url, onSuccess = null, onError = null) {

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (typeof onSuccess === 'function') {
      onSuccess(data);
    }

    return data;

  } catch (err) {
    console.error('Fetch error:', err);

    if (typeof onError === 'function') {
      onError(err);
    }

  } finally {
  }

}

function read(feIntersectionId) {
    const url = `${apiLink}?action=read&intersectionID=${feIntersectionId}`;

    return fetchData(url).then(returnData => {
        if (!returnData) return null;
        console.log("API:", returnData);
        return returnData;
    });
}

async function main() {
  while (true) {
    if (window.feIntersectionId > 0) {
      read(window.feIntersectionId).then(returnData => {
        if (returnData?.data) {
          updateGridAreasCSSVar(returnData.data);
          window.foorietapid = buildFooriEtapidFromBackend(returnData);
        }
      });
    }
    await new Promise(resolve => setTimeout(resolve, 10_000));
  }
}

main();