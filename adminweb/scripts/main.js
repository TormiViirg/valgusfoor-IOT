const apiLink = "https://script.google.com/macros/s/AKfycbzSBMtuJccPkmyGXEHG0rV0QvDhbFU6derWvsV46hXF6_hOru6SecUz11oFXObRXGHs5g/exec"
let lightData = [];
let success = false;
let time = 0;
let messages = [];

let loaded = false;

let lights = 'none';
let cycles = 'none';
let saving = false;

const lightsTable = {
  id: "lights",
  data: 'none',
  headers: 'none',
  highestID: {
    base: 0,
    changed: 0,
  },
  default: {
    IsMainTrafficLight: false,
    IntersectionID: 0,
    CardinalDirection: 'S',
    Offset: 0,
    Tile: 'a1',
    CycleID: 1,
  },
  inputs: {
    IsMainTrafficLight: 'TFButton',
    IntersectionID: 'intInput',
    CardinalDirection: 'selectionNSEW',
    Offset: 'intInput',
    Tile: '2DinputCharInt',
    CycleID: 'intInput',
  },
  savedChanges: [],
};

const cyclesTable = {
  id: "cycles",
  data: 'none',
  headers: 'none',
  highestID: {
    base: 0,
    changed: 0,
  },
  default: {
    Length: 20,
    RedRatio: 0.2,
    RedYellowRatio: 0.2,
    GreenRatio: 0.2,
    GreenYellowRatio: 0.2,
    YellowRatio: 0.2,
    BlinkStart: 1320,
    BlinkEnd: 420,
  },
  inputs: {
    Length: 'intInput',
    RedRatio: 'ratioInput',
    RedYellowRatio: 'ratioInput',
    GreenRatio: 'ratioInput',
    GreenYellowRatio: 'ratioInput',
    YellowRatio: 'ratioInput',
    BlinkStart: 'timeInput',
    BllinkEnd: 'timeInput',
  }, 
  savedChanges: [],
};

const allTables = [lightsTable, cyclesTable];

const cyclesTableId = "cyclesTable";
const loadButtonId = 'load_button';
const saveButtonId = 'save_button';
const addLightButtonId = 'button_add_light';
const addCycleButtonId = 'button_add_cycle';
const printChangesButtonId = 'print_changes';

const idString = 'ID';

window.onload = function init() {
  if (!loaded) {
    let saveButton = document.getElementById(saveButtonId);
    let addLightButton = document.getElementById(addLightButtonId);
    let addCycleButton = document.getElementById(addCycleButtonId);
    let printChangesButton = document.getElementById(printChangesButtonId);
    saveButton.classList.add('inactive');
    addLightButton.classList.add('inactive');
    addCycleButton.classList.add('inactive');
    printChangesButton.classList.add('inactive');
  };
}

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

function load() {
  action = "adminRead"
  let url = apiLink+"?action="+action;

  fetchData(url)
  .then(returnData => {
    if (!returnData) return;
    const { data, success, time, messages } = returnData;

    lightsTable.data = data.lights.rows;
    lightsTable.headers = data.lights.headers;
    lightsTable.highestID.base = data.lights.highestID;
    lightsTable.highestID.changed = data.lights.highestID;
    cyclesTable.data = data.cycles.rows;
    cyclesTable.headers = data.cycles.headers;
    cyclesTable.highestID.base = data.cycles.highestID;
    cyclesTable.highestID.changed = data.cycles.highestID;

    updateTable(lightsTable);
    updateTable(cyclesTable);
    document.getElementById(loadButtonId).addEventListener('click', () => load());

    if (!loaded) {
      let saveButton = document.getElementById(saveButtonId);
      let addLightButton = document.getElementById(addLightButtonId);
      let addCycleButton = document.getElementById(addCycleButtonId);
      let printChangesButton = document.getElementById(printChangesButtonId);

      saveButton.classList.remove('inactive');
      addLightButton.classList.remove('inactive');
      addCycleButton.classList.remove('inactive');
      printChangesButton.classList.remove('inactive');

      saveButton.addEventListener('click', () => save());
      addLightButton.addEventListener('click', () => addTableEntry(lightsTable));
      addCycleButton.addEventListener('click', () => addTableEntry(cyclesTable));
      printChangesButton.addEventListener('click', () => changesAlert([lightsTable, cyclesTable]));
    };
    loaded = true;
    return returnData;
  })
}

function buildTableRow(table, dataObj, { isNew = false } = {}) {
  const tr = document.createElement("tr");

  const keys = Object.keys(dataObj);

  keys.forEach(header => {
    const td = document.createElement("td");

    if (header !== "ID") {
      const input = inputElementHandler(
        table.inputs[header],
        dataObj[header],
        dataObj.ID,
        header,
        table
      );

      td.appendChild(input);
    } else {
      td.innerText = dataObj[header];
    }

    if (isNew) {
      td.classList.add("changed");
    }

    tr.appendChild(td);
  });

  if (isNew) {
    tr.classList.add("new-row");
  }

  return tr;
}


function updateTable(table) {
  const container = document.getElementById(table.id);
  container.innerHTML = "";

  const tr = document.createElement("tr");
  tr.setAttribute("id", table.id);

  table.headers.forEach(header => {
    const th = document.createElement("th");
    th.innerText = header;
    tr.appendChild(th);
  });

  container.appendChild(tr);

  table.data.forEach(dataObj => {
    const row = buildTableRow(table, dataObj);
    container.appendChild(row);
  });
}

function addTableEntry(table) {
  if (!loaded) {
    console.log("Data not loaded!");
    return;
  }

  const container = document.getElementById(table.id);

  const newId = table.highestID.changed + 1;
  table.highestID.changed = newId;

  const obj = {};

  table.headers.forEach(header => {
    if (header !== "ID") {
      obj[header] = table.default[header];
    } else {
      obj[header] = newId;
    }
  });

  table.data.push(obj);

  const tr = buildTableRow(table, obj, { isNew: true });
  container.appendChild(tr);

  tr.classList.add("new-row");

  if (!Array.isArray(table.savedChanges)) {
    table.savedChanges = [];
  }

  table.savedChanges.push({
    ID: newId,
    __isNew: true,
    ...table.default
  });
}

function inputElementHandler(inputType, value, entryId, header, table) {
  try {
    switch (inputType) {
      case 'intInput':
        const intInput = document.createElement('input');

        intInput.setAttribute("type", "number");
        intInput.setAttribute('value', value);
        intInput.setAttribute('data-id', entryId);
        intInput.setAttribute('data-header', header);
        intInput.setAttribute('data-table', table.id);
        intInput.addEventListener('change', (e) => recordChanges(e.target, table));

        return intInput;
      case 'selectionNSEW':
        NSWESelect = document.createElement('select');
        NSWESelect.setAttribute('data-id', entryId);
        NSWESelect.setAttribute('data-header', header);
        NSWESelect.setAttribute('data-table', table.id);

        let directions = ['N','S','E','W']

        directions.forEach(direction => {
          option = document.createElement('option');
          option.setAttribute("value", direction);
          option.innerText = direction;

          NSWESelect.appendChild(option);
          NSWESelect.value = value;
        });

        NSWESelect.addEventListener('change', (e) => recordChanges(e.target, table));

        return NSWESelect;

      case '2DinputCharInt':
        const input2D = document.createElement('div');

        input2D.classList.add('input2DContainer');

        const input2DChar = document.createElement('input');
        const input2DNum = document.createElement('input');
        const charValue = value.slice(0,1);
        const numValue = value.slice(1,2);

        input2DChar.setAttribute('value', charValue);
        input2DChar.setAttribute('data-id', entryId);
        input2DChar.setAttribute('data-header', header);
        input2DChar.setAttribute('data-table', table.id);
        input2DNum.setAttribute("type", "number");
        input2DNum.setAttribute('value', numValue);
        input2DNum.setAttribute('data-id', entryId);
        input2DNum.setAttribute('data-header', header);
        input2DNum.setAttribute('data-table', table.id);

        input2DChar.addEventListener('change', (e) => recordChanges(e.target, table));
        input2DNum.addEventListener('change', (e) => recordChanges(e.target, table));

        input2D.appendChild(input2DChar);
        input2D.appendChild(input2DNum);

        return input2D;
      case 'ratioInput':
        const ratioInput = document.createElement('div');
        const ratioSlider = document.createElement('input');
        const ratioNum = document.createElement('input');

        ratioInput.classList.add('ratioInputContainer');

        ratioSlider.setAttribute("type", "range");
        ratioSlider.setAttribute("min", "0");
        ratioSlider.setAttribute("max", "1");
        ratioSlider.setAttribute("step", "0.01");
        ratioSlider.setAttribute('value', value);
        ratioSlider.setAttribute('data-id', entryId);
        ratioSlider.setAttribute('data-header', header);
        ratioSlider.setAttribute('data-table', table.id);

        ratioNum.setAttribute("type", "number");
        ratioNum.setAttribute('value', value);
        ratioNum.setAttribute("min", "0");
        ratioNum.setAttribute("max", "1");
        ratioNum.setAttribute('step', 0.01);
        ratioNum.setAttribute('data-id', entryId);
        ratioNum.setAttribute('data-header', header);
        ratioNum.setAttribute('data-table', table.id);

        ratioSlider.addEventListener("input", (e) => {
          updateRatioInputNum(e.target.value, ratioNum);
        });

        ratioSlider.addEventListener('change', (e) => recordChanges(e.target, table));

        ratioNum.addEventListener("change", (e) => {
          updateRatioInputSlider(e.target.value, ratioSlider);
        });

        ratioNum.addEventListener('change', (e) => recordChanges(e.target, table));
        ratioNum.addEventListener('change', (e) => clampValue(e.target.value, e.target.min, e.target.max, e.target));

        ratioInput.appendChild(ratioSlider);
        ratioInput.appendChild(ratioNum);

        return ratioInput;
      case 'timeInput':

        const timeInput = document.createElement('input');

        timeInput.setAttribute("type", "time");
        timeInput.setAttribute('value', value);

        timeInput.setAttribute('value', minutesToTime(value));
        timeInput.setAttribute('data-id', entryId);
        timeInput.setAttribute('data-header', header);
        timeInput.setAttribute('data-table', table.id);

        timeInput.addEventListener('change', (e) => recordChanges(e.target, table));

        return timeInput;
      case 'TFButton':
        const tfButton = document.createElement('input');

        tfButton.setAttribute('type', 'checkbox')

        tfButton.checked = Boolean(value);
        tfButton.value = value;

        tfButton.setAttribute('data-id', entryId);
        tfButton.setAttribute('data-header', header);
        tfButton.setAttribute('data-table', table.id);

        tfButton.addEventListener('change', (e) => recordChanges(e.target, table));
        return tfButton
    }
  } catch (err) {
  }
};

function updateRatioInputSlider(value, target){
  target.value = value;
};

function updateRatioInputNum(value, target){
  target.value = value;
};

function clampValue(value, min, max, target){
  target.value = Math.min(Math.max(value, min), max);
};


function recordChanges(target, table) {
  const targetId = target.getAttribute('data-id');
  const targetHeader = target.getAttribute('data-header');

  const base = table.data.find(({ ID }) => String(ID) === String(targetId));
  if (!base) return;

  if (!Array.isArray(table.savedChanges)) {
    table.savedChanges = [];
  }

  let newValue = target.value;

  if (target.type === "time") {
    newValue = timeToMinutes(newValue);
  };

  const originalValue = base[targetHeader];

  if (typeof originalValue === "number") {
    newValue = Number(newValue);
    if (Number.isNaN(newValue)) newValue = null;
  }

  if (typeof originalValue === "boolean") {
    newValue = target.checked;
  }

  const isDifferent = !Object.is(newValue, originalValue);

  if (isDifferent) {
    target.closest("td").classList.add("changed");
  } else {
    target.closest("td").classList.remove("changed");
  }

  let changeRow = table.savedChanges.find(
    row => String(row.ID) === String(targetId)
  );

  if (isDifferent) {
    
    if (!changeRow) {
      changeRow = { ID: base.ID };
      table.savedChanges.push(changeRow);
    }

    changeRow[targetHeader] = newValue;

  } else {
    if (changeRow) {
      delete changeRow[targetHeader];

      if (Object.keys(changeRow).length === 1) {
        table.savedChanges = table.savedChanges.filter(
          row => String(row.ID) !== String(targetId)
        );
      }
    }
  }

}

function changesAlert(tables){
  let fullChanges = getAllChanges(tables);
  window.alert(JSON.stringify(fullChanges));
}

function getAllChanges(tables){
  let fullChanges = {}

  tables.forEach(table => {
    fullChanges[table.id] = table.savedChanges;
  });

  return fullChanges;
};

function timeToMinutes(timeString) {
  const [h, m] = timeString.split(":").map(Number);
  return h * 60 + m;
};

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
};

function save() {
  if (saving) {
    window.alert("Please wait for the save to finish!");
    return;
  }

  saving = true;

  const saveData = getAllChanges(allTables);

  const json = JSON.stringify(saveData);
  const encoded = encodeURIComponent(json);

  const url = apiLink + "?action=adminWrite&data=" + encoded;

  fetchData(url)
    .then(returnData => {
      if (!returnData) return;

      if (returnData.success === true) {

        applySavedChangesToBaseData();

        clearAllChangedMarks();

        window.alert(returnData.messages.join("\n"));
      } else {
        window.alert(returnData.messages.join("\n"));
      }
    })
    .catch(err => {
      console.error("Save failed:", err);
      window.alert("Save failed: " + err.message);
    })
    .finally(() => {
      saving = false;
    });
}



function clearAllChangedMarks() {
  document.querySelectorAll(".changed").forEach(el => {
    el.classList.remove("changed");
  });

  document.querySelectorAll(".new-row").forEach(el => {
    el.classList.remove("new-row");
  });

  allTables.forEach(table => {
    table.savedChanges = [];
  });
}

function applySavedChangesToBaseData() {
  allTables.forEach(table => {
    table.savedChanges.forEach(changeRow => {
      const baseRow = table.data.find(r => String(r.ID) === String(changeRow.ID));
      if (!baseRow) return;

      Object.keys(changeRow).forEach(key => {
        if (key !== "ID" && key !== "__isNew") {
          baseRow[key] = changeRow[key];
        }
      });
    });
  });
}