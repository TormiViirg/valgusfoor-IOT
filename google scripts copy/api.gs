const DATABASE_ID = '';
const lightTableName = 'lights';
const cycleTableName = 'cycles';
const schemaTableName = 'schema';


function returnFormat(){
  return {
    success: false,
    messages: [],
    time: 0,
    data: {}
  }
};

function output(res) {
  res.time = Date.now();
  return ContentService
    .createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}

function getDB(){
  return SpreadsheetApp.openById(DATABASE_ID)
};

function getTable(name, db=null){
  const database = db || getDB();
  const table = database.getSheetByName(name);
  if (!table) throw new Error(`Sheet not found: ${name}`);
  return table;
};

function getHighestId(rows) {
  let max = 0;

  rows.forEach(row => {
    const id = Number(row.ID);
    if (!isNaN(id) && id > max) {
      max = id;
    }
  });

  return max;
}

function doGet(e) {
  const res = returnFormat();
  const action = e.parameter.action;

  try {
    switch (action) {
      case 'read':
        return read(e.parameter.intersectionID, res);
      case 'adminRead':
        return adminRead(res);
      case 'adminWrite':
        return adminWrite(e.parameter.data, res);
      default:
        throw new Error('Invalid action');
    }
  } catch (err) {
    res.messages.push(err.message);
    console.log(err.message);
    return ContentService.createTextOutput('Invalid request');
  }
};

function run() {
  const fakeEvent = {
    parameter: {
      action: "read",
      intersectionID: 1,
    }
  };
  const output = doGet(fakeEvent);
  Logger.log(output.getContent());
};

function read(intersectionID, res) {
  const db = getDB();

  const lightsTable = getTable(lightTableName, db);
  const cyclesTable = getTable(cycleTableName, db);

  const lightsData = lightsTable.getDataRange().getValues();
  const cyclesData = cyclesTable.getDataRange().getValues();

  const lightHeaders = lightsData[0];
  const cycleHeaders = cyclesData[0];

  const intersectionIdIndex = lightsData[0].findIndex(header => header === "IntersectionID");
  const cycleIdIndex = lightsData[0].findIndex(header => header === "CycleID");

  const lightsValidObjects = lightsData
    .slice(1)
    .filter(row => String(row[intersectionIdIndex]) === String(intersectionID)
  );

  const cycleLookup = Object.fromEntries(
    cyclesData.slice(1).map(row => [
      row[0],
      Object.fromEntries(cycleHeaders.map((h, i) => [h, row[i]]))
    ])
  );

  console.log('CycleLookup:');
  console.log(cycleLookup);

  const organizedData = lightsValidObjects.map(row => {
    let obj = Object.fromEntries(
      lightHeaders.map((h, i) => [h, row[i]])
    );

    const cycleId = row[cycleIdIndex];
    if (cycleId && cycleLookup[cycleId]) {
      obj.CycleData = cycleLookup[cycleId];
    }

    return obj;
  });

  res.success = true;
  res.data = organizedData;

  console.log("Res:");
  console.log(res);

  console.log(JSON.stringify(res));

  return output(res);

}

function adminRead(res) {
  const db = getDB();

  const lightsTable = getTable(lightTableName,db);
  const cyclesTable = getTable(cycleTableName, db);

  const lightsData = lightsTable.getDataRange().getValues();
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

  const highestLightId = getHighestId(organizedLights);
  const highestCycleId = getHighestId(organizedCycles);

  res.success = true;
  res.data = {};
  res.data.lights = {
    headers: lightHeaders,
    rows: organizedLights,
    highestID: highestLightId,
  };

  res.data.cycles = {
    headers: cycleHeaders,
    rows: organizedCycles,
    highestID: highestCycleId
  };

  console.log('OrganizedLights:');
  console.log(organizedLights);
  console.log('OrganizedCycles:');
  console.log(organizedCycles);
  console.log('Res (before time added):');
  console.log(res);

  return output(res);

}


function adminWrite(data, res) {
  const db = getDB();

  if (typeof data === "string") {
    data = JSON.parse(data);
  }

  const tables = [
    { name: lightTableName, payloadKey: "lights" },
    { name: cycleTableName, payloadKey: "cycles" }
  ];

  tables.forEach(tableInfo => {
    const sheet = getTable(tableInfo.name, db);
    const payload = data[tableInfo.payloadKey];
    if (!payload || !Array.isArray(payload)) return;

    const range = sheet.getDataRange();
    const values = range.getValues();

    const headers = values[0];
    const rows = values.slice(1);

    const idIndex = headers.indexOf("ID");
    if (idIndex === -1) throw new Error(`No ID column in ${tableInfo.name}`);


    const rowIndexById = {};
    rows.forEach((row, i) => {
      const id = row[idIndex];
      if (id !== "" && id !== null && id !== undefined) {
        rowIndexById[String(id)] = i + 2; 
      }
    });

    const rowsToAppend = [];

    payload.forEach(obj => {
      const isNew = obj.__isNew === true;

      if (isNew || obj.ID === undefined || rowIndexById[String(obj.ID)] === undefined) {
    
        const newRow = headers.map(h => obj[h] !== undefined ? obj[h] : "");
        rowsToAppend.push(newRow);
        return;
      }

   
      const sheetRowIndex = rowIndexById[String(obj.ID)];

      const rowRange = sheet.getRange(sheetRowIndex, 1, 1, headers.length);
      const existingRow = rowRange.getValues()[0];

     
      headers.forEach((h, colIndex) => {
        if (h in obj && h !== "__isNew") {
          existingRow[colIndex] = obj[h];
        }
      });

      
      rowRange.setValues([existingRow]);
    });


    if (rowsToAppend.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
    }
  });

  res.success = true;
  res.messages.push("Database updated successfully.");
  return output(res);
}

