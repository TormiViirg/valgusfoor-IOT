function myFunction() {
  let foorinr=1;
  let leht=SpreadsheetApp.openById("1j56SVb1ZDHEH-ZQHu7edBH6seBY0R-VnB60y872Fza4").getSheets()[0];
  let tabel=leht.getRange(1,1, 5, 5).getValues();
  let vastus=[tabel[4][1], tabel[1][foorinr]];
  console.log(vastus);
}

function doGet(e){
  let leht=SpreadsheetApp.openById("1j56SVb1ZDHEH-ZQHu7edBH6seBY0R-VnB60y872Fza4").getSheets()[0];
  let tabel=leht.getRange(1,1, 5, 5).getValues();
  let vastus=[tabel[4][1], tabel[1][parseInt(e.parameter.foorinr)]];
  return ContentService.createTextOutput(JSON.stringify(vastus)).setMimeType(ContentService.MimeType.JSON);
}

// https://script.google.com/macros/s/AKfycbxV1OxeoNoeuYFW4RfOa3Ar2VDYTI6VjaWTEQwaSkPQAqxQttvqTap8HbvQ-onIgVF-nQ/exec