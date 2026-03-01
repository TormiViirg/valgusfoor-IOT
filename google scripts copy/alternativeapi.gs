const database = '';

function returnFormat(){
  return {
    success: false,
    messages: [],
    time: 0,
    data: {}
  }
}

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'read') return read(e.parameter.intersectionID, returnFormat());
  if (action === 'adminRead') return adminRead(returnFormat());
  console.log("Invalid request");
  return ContentService.createTextOutput('Invalid request');
}

function run() {
  const fakeEvent = {
    parameter: {
      action: "adminRead"
    }
  };
  const output = doGet(fakeEvent);
  Logger.log(output.getContent());
}

function read(intersectionID, returneddata) {
  const lightsTable = SpreadsheetApp.openById(database).getSheets()[0];
  const lightsData = lightsTable.getDataRange().getValues();
  const cyclesTable = SpreadsheetApp.openById(database).getSheets()[1];
  const cyclesData = cyclesTable.getDataRange().getValues();
  const lightHeaders = lightsData[0];
  const cycleHeaders = cyclesData[0];

  const intersectionIdIndex = lightsData[0].findIndex(header => header === "IntersectionID");
  const cycleIdIndex = lightsData[0].findIndex(header => header === "CycleID");
  const lightsValidObjects = lightsData.slice(1).filter(row => {
    return String(row[intersectionIdIndex]) === String(intersectionID);
  });

  const cycleLookup = Object.fromEntries(
    cyclesData.slice(1).map(row => [row[0],
      Object.fromEntries(cycleHeaders.map((h, i) => [h, row[i]]))
    ])
  );

  console.log(cycleLookup);

  const organizedData = lightsValidObjects.map(row => {
    let obj = {};
    lightHeaders.forEach((header, i) => {
      obj[header] = row[i];
    });

    const cycleId = row[cycleIdIndex];
    if (cycleId && cycleLookup[cycleId]) {
      obj.CycleData = cycleLookup[cycleId];
    }

    return obj;
  });

  returneddata.success = true;
  returneddata.data = organizedData;
  returneddata.time = new Date().getTime();

  console.log(returneddata);

  return ContentService.createTextOutput(JSON.stringify(returneddata)).setMimeType(ContentService.MimeType.JSON);

}

function adminRead(returneddata) {
  const lightsTable = SpreadsheetApp.openById(database).getSheets()[0];
  const lightsData = lightsTable.getDataRange().getValues();
  const cyclesTable = SpreadsheetApp.openById(database).getSheets()[1];
  const cyclesData = cyclesTable.getDataRange().getValues();
  const lightHeaders = lightsData[0];
  const cycleHeaders = cyclesData[0];

  const lightsValidObjects = lightsData.slice(1);
  const cyclesValidObjects = cyclesData.slice(1);

  const organizedLights = lightsValidObjects.map(row => {
    let obj = {};
    lightHeaders.forEach((header, i) => {
      obj[header] = row[i];
    });

    return obj;
  });

  const organizedCycles = cyclesValidObjects.map(row => {
    let obj = {};
    cycleHeaders.forEach((header, i) => {
      obj[header] = row[i];
    });

    return obj;
  });

  returneddata.success = true;
  returneddata.data.lights = organizedLights;
  returneddata.data.cycles = organizedCycles;
  returneddata.time = new Date().getTime();

  console.log(organizedLights);
  console.log(organizedCycles);
  console.log(returneddata);

  return ContentService.createTextOutput(JSON.stringify(returneddata)).setMimeType(ContentService.MimeType.JSON);

}