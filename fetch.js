const apiLink = "https://script.google.com/macros/s/AKfycbwa8_XNQIsyBdKUePjh6k2dhiJgCkeR02cYKLanzdP7gDUxvz17T6vxs7OJ-Wi2Idd7ZA/exec"
let lightData = [];
let success = false;
let time = 0;
let messages = [];


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
    action = "read"
    intersectionID = feIntersectionId
    let url = apiLink+"?action="+action+"&intersectionID="+intersectionID;

    fetchData(url)
    .then(returnData => {
        if (!returnData) return;
        const { data, success, time, messages } = returnData;
        console.log(success, time, messages, data);
        return returnData;
    })
}

async function main(feIntersectionId) {
  while (true) {
    read(feIntersectionId);
    await new Promise(resolve => setTimeout(resolve, 10_000));
  }
}