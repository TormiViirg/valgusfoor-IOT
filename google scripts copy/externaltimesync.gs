function myFunction() {
  console.log(new Date().getTime())
}

function doGet(){
  return ContentService.createTextOutput(JSON.stringify(new Date().getTime())).setMimeType(ContentService.MimeType.JSON);
}

// https://script.google.com/macros/s/AKfycbxdq8ssXCLFLxr_-oP_ImA6GZ-fRQxilwQHu0cnx1vFhiVfGkqo8hNtQWaJVhi-aDW6/exec