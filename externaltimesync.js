let nihe = 0;
let kestus = 0;
let foorinihe = 0;

function algusCommon() {
  fetch(
    "https://script.google.com/macros/s/AKfycbxdq8ssXCLFLxr_-oP_ImA6GZ-fRQxilwQHu0cnx1vFhiVfGkqo8hNtQWaJVhi-aDW6/exec"
  )
    .then(d => d.text())
    .then(edasi)
  ;

  kysiKonf();
  setInterval(kysiKonf, 10000);
}


function edasi(d) {
  console.log(d);
  nihe = new Date().getTime() - parseInt(d);
  console.log(nihe);
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
  console.log(d);
  kestus = d[0] * 1000;
  foorinihe = d[1] * 1000;
}
