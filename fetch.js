const apiLink = "https://script.google.com/macros/s/AKfycbwp347_jkAWND-uTkNvrxgisa7k5EiiwceV6rdwYlQvDekaUzkpwMPTh_0BWt6iGzbY/exec"

let lightData = [];
let success = false;
let time = 0;
let messages = [];

function updateGridAreasCSSVar(data) {
    console.log("GRID VAR INPUT:", data);

    const root = document.documentElement;

    data.forEach(item => {
        if (!item.CardinalDirection || !item.Tile) return;

        switch (item.CardinalDirection) {
            case "N": root.style.setProperty('--grid-N', item.Tile); break;
            case "E": root.style.setProperty('--grid-E', item.Tile); break;
            case "S": root.style.setProperty('--grid-S', item.Tile); break;
            case "W": root.style.setProperty('--grid-W', item.Tile); break;
        }
    });
}

read(feIntersectionId).then(returnData => {
  if (returnData?.data) {
    updateGridAreasCSSVar(returnData.data);
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
        if (window.feIntersectionId !== undefined) {
            read(window.feIntersectionId).then(returnData => {
                if (returnData?.data) updateGridAreasCSSVar(returnData.data);
            });
        }
        await new Promise(resolve => setTimeout(resolve, 10_000));
    }
}

main();