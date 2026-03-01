# Valgusfoori süsteem

Riistvaraseadme tööd juhtiv ja visualiseeriv veebikaart
Liikluse erakorraliseks korraldamiseks mõeldud madala jalajäljega CRUD-rakendus, mis ei vaja domeeni ega tasulist andmebaasi. Süsteemi kontroller rakendab äriloogikat sensoriandmete ja halduspaneelis tehtud seadistuste alusel. Pärast paigaldamist saab ristmiku seadistatud foore jälgida NTP-serveriga sünkroniseeritud veebivaates.

Modulaarne prototüüp ristmikuvalgusfooride **visualiseerimiseks ja juhtimiseks**, kasutades:
- **virtuaalset veebipõhist valgusfoori kasutajaliidest** (HTML/CSS/JavaScript),
- **Google Sheets**-põhist andmebaasi (tabelid: `lights`, `cycles`),
- **Google Apps Script**-i backend API-t, mis ühendab eri komponendid,
- valikulisi **füüsilisi valgusfoore**, mida juhivad **NodeMCU/ESP8266** kontrollerid,
- **admin-lehte** Sheetsi andmete haldamiseks.

> Tegemist on: **Prototüübiga** (virtuaalse ristmiku põhivoog töötab; admini logivaade ja osa füüsilise riistvara funktsioone on veel poolikud). 

Eesmärk on luua üle maailma kasutatav avatud lähtekoodiga fooride süsteem, mida saab kiirelt ülesseada liikluse ajutiseks juhtimiseks kriisi olukordades, teetööde ajal, tehniliste rikete korral jms olukordade ajal kus päris valgusfoore pole mõistlik rakendada.

Selleks otsustati vältida keskservereid ja spetsialiseerritud riistvara, et tagada võimalikult kiire ja modullaarne ülesseadmis protsess.
Kuna aga tihti on vaja näha ristmike tööd ja seisundit reaalajas kaugemalt ei sobinud selleks localhost ja kasutajatelt serveri iseseisva serveri ülesseadmine ja vastava seadme kohapeal pidevalt seeshoidmine võib keeruliseks osutuda otsustatit google sheetsi teed minna. See tagas googlile omase uptime-i, bürokraadile tuttava kasutajaliidese andmebaasi haldamiseks soovi korral ja ei vaja tasulist domeeni ülesseadmist.

---

## Sisukord
- [Omadused](#omadused)
- [Arhitektuur](#arhitektuur)
- [Repo struktuur](#repo-struktuur)
- [Kiirkäivitus](#kiirkäivitus)
- [Seadistamine](#seadistamine)
- [Backend API](#backend-api)
- [Admin-paneel](#admin-paneel)
- [Füüsiline kontroller (NodeMCU/ESP8266)](#füüsiline-kontroller-nodemcuesp8266)
- [Tõrkeotsing](#tõrkeotsing)
- [Teekaart](#teekaart)
- [Kaastöö](#kaastöö)
- [Turvalisus](#turvalisus)
- [Litsents](#litsents)

---

## Omadused
- **Virtuaalne ristmiku UI**: valgusfoorid renderdatakse **CSS Grid**-il; uuendus toimub kord sekundis.
- **Deterministlik juhtloogika**: lõplikud automaadid **2-, 3- ja 4-suunalistele** ristmikele.
- **Peafoori põhine olekukaardistus**: üks "main" valgusfoor määrab ristmiku faasi; teiste suundade seis tuletatakse deterministlikult.
- **Serveri ajale ankurdus**: lokaalne aeg seotakse autoriteetse serveriajaga Apps Scripti kaudu; triivi vähendatakse uuesti sünkroonimisega.
- **Konfiguratsioon Google Sheetsis**: ristmikke ja tsükleid saab muuta ilma frontendi uuesti deploy'mata.
- **Öine kollase vilkumise override**: seadistatav päevane vilkumisaken (`BlinkStart`, `BlinkEnd`), sh üle südaöö ulatuvad aknad.
- **Turvaline varurežiim**: kui andmed on puudu või vigased, saab süsteem langeda olekusse **ALL_YELLOW**.

---

## Arhitektuur

### Kõrgtaseme andmevoog

```text
 Brauser (virtuaalne UI)                  Google
 ┌──────────────────────┐               ┌──────────────────────┐
 │ valgusfoor.html      │   fetch/read  │ Apps Script Web App  │
 │ styles.css           ├──────────────►│  endpoints: read/... │
 │ navigation.js        │               └─────────┬────────────┘
 │ fetch.js             │                         │
 │ externaltimesync.js  │                         │ reads/writes
 │ foorlogic.js         │                         ▼
 │ statemachines.js     │               ┌──────────────────────┐
 │ temporalrules.js     │               │ Google Sheets        │
 └──────────────────────┘               │  lights / cycles     │
                                        └──────────────────────┘

 Valikuline riistvara:
 NodeMCU/ESP8266 kontrollerid loevad ajastuse/konfiguratsiooni ja juhivad
 füüsilisi valgusfoore + logimist (prototüüp)
```

### Põhimõisted
- **`lights`**: üks rida iga valgusfoori kohta igas ristmiku suunas (N/E/S/W); sisaldab muu hulgas `Tile`-i (gridi asukoht) ja `IsMainTrafficLight` välja.
- **`cycles`**: üks rida iga tsüklikirjelduse kohta; sisaldab faasisuhteid (`RedRatio`, `GreenRatio` jne) ja vilkumisakent (`BlinkStart`, `BlinkEnd`).
- **Faasiarvutus**: `(autoriteetneAeg - nihe) mod kestus` määrab käimasoleva faasi; suhtarvud vastenduvad diskreetseteks olekuteks.
- **Ristmiku tüübi tuvastus**: valgusfooride arv (2/3/4) valib sobiva lõpliku automaadi; vigane arv viib turvarežiimi.

Põhjalikuma tehnilise kirjelduse leiab failist **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)**.

---

## Repo struktuur
Projekt jaguneb **virtuaalseks UI-ks**, **admin UI-ks**, **Liimina töötavateks google app scriptideks** ning **riistvara** komponentideks.

### Virtuaalne UI (VeebiFoor)
- `valgusfoor.html` - HTML kasutajaliides, skriptide ja stiilide laadimine, ristmiku valikunupud, valgusfooride DOM.
- `styles.css` - CSS Grid paigutus (12x10 prototüüp), valgusfooride stiil ja positsioneerimine CSS muutujatega.
- `externaltimesync.js` - ankurdab lokaalse aja serveriajale ning laeb kestuse + nihke.
- `fetch.js` - loeb ristmiku konfiguratsiooni ja tsükleid; valideerib ning puhastab backendist saadud andmeid.
- `navigation.js` - haldab ristmiku valikut, uuendab CSS gridi positsioone ja valib õige automaadi.
- `statemachines.js` - lõplikud automaadid 2/3/4-suunaliste ristmike jaoks; sisaldab turvarežiimi varuvarianti.
- `foorlogic.js` - arvutab faasi, kaardistab peafoori värvi ristmiku olekuks ja uuendab DOM-i lampe.
- `temporalrules.js` - kontrollib öist vilkumisakent; aktiivsel ajal sunnib oleku `ALL_YELLOW`-ks.

### Admin UI (AdminLeht)
- `main.html` - admin-leht Sheetsi-põhise andmebaasi (`lights` / `cycles`) haldamiseks.
- `main.js` - admin-loogika: laadimine, salvestamine, muudatuste jälgimine.

### Backend + andmebaas + riistvara
- **Google Sheets**: lehed `lights`, `cycles`.
- **Google Apps Script Web App**: endpoint'id nagu `read`, `adminRead`, `adminWrite`.
- **NodeMCU/ESP8266**: valikuline füüsilise valgusfoori kontroller (prototüüp).

---

## Backend teenused (oluline)

See repo kasutab **kolme** Google Apps Script web app'i:

1) **Põhiandmebaasi API** (`api.gs`): Pärib andmebaasist Sheetsist `lights` + `cycles`  
2) **Aja sünkroniseerimise API** (`externaltimesync.gs`): tagastab epoch ms kliendi aja ankurdamiseks  
3) **Tsükli ajastuse konfiguratsiooni API** (`configapi.gs`): tagastab `[kestusSekundites, niheSekundites]` virtuaalse UI jaoks

Dokumentatsioon:
- `BACKEND_SERVICES.md`
- `CONFIG_SHEET.md`
- `SCHEMA_CANONICAL.md`

> Kui deploy'd ainult põhiandmebaasi API, ei pruugi virtuaalne UI õigesti animeeruda, sest `kestus` / `foorinihe` jäävad väärtusele 0.

---

## Kiirkäivitus

Täielik paigaldusjuhend on failis **`INSTALLATION.md`**.

### 1) Loo Google Sheetsi andmebaas
1. Loo uus Google Sheetsi fail (nt `TrafficLightsDB`).
2. Loo kaks lehte:
   - `lights`
   - `cycles`
3. Lisa 1. reale päised.

**`lights` veerud**
- `ID`
- `IsMainTrafficLight`
- `IntersectionID`
- `CardinalDirection` (`N`, `E`, `S`, `W`)
- `Offset` (praegu koodis kasutamata)
- `Tile` (grid-area nimi, nt `g5`)
- `CycleID`

**`cycles` veerud**
- `ID`
- `Length`
- `RedRatio`
- `RedYellowRatio`
- `YellowRatio`
- `GreenYellowRatio`
- `GreenRatio`
- `BlinkStart` (minutid pärast südaööd, 0-1439)
- `BlinkEnd` (minutid pärast südaööd, 0-1439)

4. Sea jagamisõigused:
   - Kui deploy'd avaliku web app endpoint'i, võib olla vaja Sheets vastavalt kättesaadavaks teha.
   - **Ettevaatust**: avalik ligipääs võib konfiguratsiooniandmeid paljastada. Vaata [Turvalisus](#turvalisus).

---

### 2) Deploy Google Apps Script backend
1. Ava Google Drive'is **New -> More -> Google Apps Script**.
2. Kleebi sisse backendi kood Google Scriptside koopiast.
3. Määra skriptis oma Sheetsi / andmebaasi ID (asenda näidisväärtused).
4. Deploy Web Appina:
   - **Deploy -> New deployment -> Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (või kitsam, kui lisad autentimise)
5. Kopeeri Web App URL:
   - kujul `https://script.google.com/macros/s/.../exec`

---

### 3) Käivita virtuaalne valgusfoori UI
**Eeldused:** VS Code + Live Server (või mõni muu staatiliste failide server) ja kaasaegne veebibrauser.

1. Ava projekt VS Code'is.
2. Määra backendi baas-URL (soovitavalt ühest kohast):
   - Näide:
     ```js
     const BACKEND_BASE_URL = "https://script.google.com/macros/s/XXXX/exec";
     ```
3. Serveeri `valgusfoor.html`:
   - VS Code Live Server -> "Open with Live Server"
   - või:
     ```bash
     python -m http.server 5500
     ```
4. Brauseris vali ristmik (Ristmik 1..4).
5. Veendu, et lambid uuenevad ajas serveriga sünkroonitult.  
   Kui debug-plokk on sisse lülitatud, peaks see näitama triivi- ja faasiarvutuse detaile.

---

## Seadistamine

> **Skeemi märkus:** `cycles` tabel kasutab praegu veerunime `Length` (ajalooline nimekuju / typo). Firmware loeb välja `CycleData["Length"]`.

> **Admini märkus:** praegune admin-UI viitab väljadele `NightStart` / `NightEnd`, kuid tööloogika kasutab `BlinkStart` / `BlinkEnd`. Vaata `SCHEMA_CANONICAL.md`.

### Ristmiku konfiguratsioon (`lights`)
Iga rida kirjeldab ühe konkreetse ristmiku ühe suuna valgusfoori.
________________________________________________________________________
| Väli                 | Tähendus                                       |
|----------------------|------------------------------------------------|
| `ID`                 | Unikaalne rea identifikaator                   |
| `IsMainTrafficLight` | `TRUE`, kui tegemist on "master" valgusfooriga |
| `IntersectionID`     | Ristmiku identifikaator (nt 1..4)              |
| `CardinalDirection`  | `N`, `E`, `S`, `W`                             |
| `Offset`             | Nihe (sekundid / ms) - praegu kasutamata       |
| `Tile`               | CSS gridi area nimi (nt `g5`)                  |
| `CycleID`            | Viide `cycles.ID` reale                        |

### Tsükli konfiguratsioon (`cycles`)
Tsükli faasid on kirjeldatud **suhtarvudena (0..1)**, mille summa peaks ligikaudu olema 1. Puuduvad või 0 väärtused jäetakse vahele.

| Väli | Tähendus |
|------|---------|
| `ID` | Tsükli identifikaator |
| `Length` | Valikuline / reserveeritud kestuse väli |
| `RedRatio` | punase faasi osakaal |
| `RedYellowRatio` | punane+kollane faasi osakaal |
| `GreenRatio` | rohelise faasi osakaal |
| `GreenYellowRatio` | roheline+kollane faasi osakaal |
| `YellowRatio` | kollase faasi osakaal |
| `BlinkStart` | minutid pärast südaööd (0-1439) |
| `BlinkEnd` | minutid pärast südaööd (0-1439); võib üle südaöö jätkuda |

### Öise kollase vilkumise käitumine
- Kui praegune lokaalne (serveriga korrigeeritud) aeg jääb vahemikku `[BlinkStart, BlinkEnd]`, sunnitakse ristmiku automaat olekusse **`ALL_YELLOW`**.
- Kui `BlinkStart > BlinkEnd`, tähendab see, et vilkumisaken ulatub üle südaöö.

---

## Backend API

### Oodatav vastuse kuju
Virtuaalne UI ootab JSON-i umbes sellisel kujul:

```json
{
  "data": [
    {
      "ID": 0,
      "IntersectionID": 1,
      "CardinalDirection": "N",
      "IsMainTrafficLight": true,
      "Tile": "g5",
      "CycleID": 1,
      "CycleData": {
        "RedRatio": 0.3,
        "RedYellowRatio": 0.1,
        "GreenRatio": 0.3,
        "GreenYellowRatio": 0.1,
        "YellowRatio": 0.2,
        "BlinkStart": 120,
        "BlinkEnd": 420
      }
    }
  ]
}
```

### Admin-endpoint'id
- Tavaliselt kasutatakse Sheetsi-põhise andmebaasi haldamiseks endpoint'e `adminRead` ja `adminWrite`.

> Täpne teostus sõltub sinu Apps Scripti versioonist (lihtsustatud või admin-funktsioonidega variant).

---

## Admin-paneel
Admin-leht on mõeldud järgmisteks tegevusteks:
- `lights` / `cycles` andmete haldamine (CRUD-operatsioonid)

Käivitamiseks:
1. Määra sama `BACKEND_BASE_URL`, mida kasutab virtuaalne UI.
2. Serveeri `main.html` Live Serveriga (või muu staatiliste failide serveriga).
3. Kasuta laadimis- ja salvestamisnuppe Sheetsi andmete muutmiseks.

---

## Füüsiline kontroller (NodeMCU/ESP8266)

### Nõuded
- NodeMCU / ESP8266 (või samaväärne Wi-Fi mikrokontroller)
- Arduino IDE või PlatformIO
- ESP8266 board support package
- Teegid:
  - `ArduinoJson`
  - `ESP8266WiFi`, `ESP8266HTTPClient`, `WiFiClientSecureBearSSL` (ESP8266 paketist)
  - `time.h` (toolchain)

### Seadistus Arduino IDE-s
1. Arduino IDE -> Preferences -> **Additional Boards Manager URLs**  
   Lisa:
   ```
   https://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
2. Tools -> Board -> Boards Manager -> paigalda **esp8266**.
3. Library Manager -> paigalda **ArduinoJson**.

### Seadista saladused ja endpoint
Loo näiteks selline päisefail:

```cpp
#pragma once
const char* WIFI_SSID = "YourWifi";
const char* WIFI_PASS = "YourPassword";
const char* BACKEND_URL = "https://script.google.com/macros/s/XXXX/exec";
```

### Märkused
- Kui kontrolleri kell on vale (nt ajavööndi triiv), kontrolli ajaallika ja ajavööndi käitlemist (NTP, ajavööndi nihked või serverist tulev aeg).
- See on eriti oluline vilkumisakende korrektsel rakendumisel.

---

## Tõrkeotsing

### Virtuaalne UI ei uuene / kõik on kollane
- Backend ei ole kättesaadav, payload on vigane või ristmiku tüüp ei ole tuvastatav.
- Kontrolli:
  - Apps Script Web App on deploy'tud ja ligipääsetav.
  - `BACKEND_BASE_URL` on õige.
  - Sheetsis on vajalikud päised ja õiged andmetüübid.
  - Ristmikul on **2, 3 või 4** suunakirjet.

### Valgusfoorid kuvatakse vales gridi asukohas
- `Tile` väärtused peavad kattuma failis `styles.css` määratud **grid template area** nimedega.
- Kontrolli, et `fetch.js` uuendab CSS muutujaid (nt `--grid-N/E/S/W`) korrektsete area nimedega.

### Öine vilkumine ei käivitu
- Veendu, et `BlinkStart` / `BlinkEnd` on määratud (0-1439 minutit pärast südaööd).
- Kontrolli, et serveriga sünkroniseeritud aeg töötab (`externaltimesync`) ja lokaalse ajavööndi eeldused on õiged.

Lisaks vaata **[`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md)**.

---

## Teekaart
- [ ] Lõpeta admini logide visualiseerimine (numbriline / tekstiline / graafiline vaade).
- [ ] Muuda gridi paigutus täielikult dünaamiliseks (mitte staatiliseks prototüübiks).
- [ ] Lisa automaattestid state machine'idele ja faasikaardistusele.
- [ ] Lisa CI (lint / test) GitHub Actionsi abil.
- [ ] Dokumenteeri ja tugevda admin-operatsioonide autentimist ning autoriseerimist.
- [ ] Lisa andmebaasi sisendi valideerimine.
- [ ] Paranda turvalisust.
- [ ] Võimalda Google Apps Scriptide lisamine kasutajaliidesest.
- [ ] Lisa Arduino kella jaoks eraldi ajaserveri tugi.
- [ ] Lisa MAC-aadressi põhine füüsiliste valgusfooride sidumine.
- [ ] Lisa API valideerimine.
- [ ] Migreeri Uberi kaardisüsteemist inspireeritud heksagonaalsele gridile.
- [ ] Lisa Leaflet ja võimalus lisada UI kaudu kaardile kohandatud ülekäiguraja sprite'e.
- [ ] Lisa Arduino turve ning automaatne firmware paigaldus UI kaudu koos võrgukontrolliga.
- [ ] Tugevda tegelikku juhtloogikat selle post mortemi kirjutamisel leitud video põhjal: https://youtu.be/oov8HDz3qVk?si=OYZL9QhPs0p6U92z
- [ ] Võimalda kasutajal koostada state machine'e admin-UI kaudu.
- [ ] Paranda südaöö vilkumisrežiimi vead, mis tekkisid JavaScripti single-threaded loomuse tõttu.
- [ ] Migreeri admin-leht kasutama korrektset clock API-t.
- [ ] Migreeri virtuaalne UI kasutama `nihe` asemel andmebaasi `Offset` välja ning lisa valideerimis- ja sidumisloogika, et sama ristmiku eri valgusfooridel saaks olla erinevad aktiivsusajad. Alternatiivina võimalda mitut ristmikku ühes UI-s.
- [ ] Muuda ristmike navigeerimisnuppude arv dünaamiliseks vastavalt andmebaasi sisule.
- [ ] Lõpeta dokumentatsioon.
- [ ] Automeeri tabelite loomine ja muu ülesseadmis protsess.

---

Täiendava Eesti keelse info jaoks: https://docs.google.com/document/d/1uxojfgpZSxlzpW1JDbqd3SWI8wXYsFHPqJ4g6FGC0Vc/edit?usp=sharing

## Panustamiseks
Vaata **[`CONTRIBUTING.md`](CONTRIBUTING.md)** seadistuse, töövoo ja PR kontrollnimekirja jaoks.

---

## Turvalisus
Vaata **[`SECURITY.md`](SECURITY.md)** turvaprobleemide raporteerimise ja juhiste jaoks (Sheetsi ligipääs, web appi nähtavus, saladused).

---

## Litsents
See repo sisaldab **MIT litsentsi malli** failis [`LICENSE`](LICENSE).
