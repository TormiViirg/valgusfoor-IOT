let nihe=0;
let kestus=20000;
let foorinihe=7000;
let foorifaas=0;
let g=null;

window.foorietapid = [];

let foorikoordinaadid={
  "punane": [100, "red"],
  "kollane": [200, "yellow"],
  "roheline": [300, "green"]
}

function updateAllFoorLights(etapp){
  document.querySelectorAll('.wrapper').forEach(wrapper => {

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
  let v=foorietapid[0][1];
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
  kiht1.innerText=aeg.getHours()+":"+aeg.getMinutes()+":"+aeg.getSeconds()
  fooriaeg=((aeg-foorinihe) % kestus);
  kiht2.innerText=parseInt(fooriaeg);
  foorifaas=fooriaeg/kestus;
  kiht3.innerText=fooriEtapp();
  const et = fooriEtapp();
  kiht3.innerText = et;       
  updateAllFoorLights(et);
}
function kuvaFoor(){
  g.clearRect(0, 0, 200, 400);
}