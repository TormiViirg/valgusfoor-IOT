let lastServerTime = null; 
let lastClientTime = null;

let kestus = 0;
let foorinihe = 0;

window.getAuthoritativeMs = getAuthoritativeMs;


function algusCommon() {
  syncFromServerTime();
  setInterval(syncFromServerTime, 30000);

  kysiKonf();
  setInterval(kysiKonf, 10000);
}


function syncFromServerTime() {
  fetch(
    "https://script.google.com/macros/s/AKfycbxdq8ssXCLFLxr_-oP_ImA6GZ-fRQxilwQHu0cnx1vFhiVfGkqo8hNtQWaJVhi-aDW6/exec"
  )
    .then(d => d.text())
    .then(serverTimeStr => {
      const serverTime = parseInt(serverTimeStr, 10);
      if (isNaN(serverTime)) return;

      lastServerTime = serverTime;
      lastClientTime = Date.now();
    })
    .catch(() => {
      // server unreachable → keep running locally
    });
}


function getCurrentTime() {
  if (lastServerTime === null) {
    return new Date();
  }

  const elapsed = Date.now() - lastClientTime;
  return new Date(lastServerTime + elapsed);
}


function getAuthoritativeMs() {
  if (lastServerTime === null || lastClientTime === null) {
    return Date.now();
  }

  return lastServerTime + (Date.now() - lastClientTime);
}


function kysiKonf() {
  fetch(
    "https://script.google.com/macros/s/AKfycbxV1OxeoNoeuYFW4RfOa3Ar2VDYTI6VjaWTEQwaSkPQAqxQttvqTap8HbvQ-onIgVF-nQ/exec?foorinr=1"
  )
    .then(d => d.json())
    .then(salvestaKonf)
  ;
}


function salvestaKonf(d) {
  if (!Array.isArray(d)) return;
  kestus = d[0] * 1000;
  foorinihe = d[1] * 1000;
}