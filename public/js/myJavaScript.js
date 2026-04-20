//  Javascript Exercise 1 – JSON and Pulldown Window
"use strict";

function Init() {
  var jsonstring = '{ "Menschen" : [' +
    ' { "Vorname" : "Peter",   "Nachname" : "Müller",    "Gender" : "male",   "Rolle" : "Student"   },' +
    ' { "Vorname" : "Susanne", "Nachname" : "Lehmann",   "Gender" : "female", "Rolle" : "Studentin" },' +
    ' { "Vorname" : "Jürgen",  "Nachname" : "Schneider", "Gender" : "male",   "Rolle" : "Dozent"    },' +
    ' { "Vorname" : "Adi",     "Nachname" : "Mustermann","Gender" : "male",   "Rolle" : "Student"   }' +
    ' ] }';
  window.Menschen = JSON.parse(jsonstring);

  document.getElementById('PullupServices').addEventListener('click', dothisnow);
  document.getElementById('btnClosePullup').addEventListener('click', closePullup);
  document.getElementById('btnLeute').addEventListener('click', showMenschen);
  document.getElementById('btnCloseShow').addEventListener('click', closeShowwindow);

  document.getElementById('btnWikipedia').addEventListener('click', function () {
    var term = document.getElementById('wikiSearchInput').value.trim();
    if (term) { showWikipedia(term); }
  });
  document.getElementById('wikiSearchInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var term = this.value.trim();
      if (term) { showWikipedia(term); }
    }
  });
}

function dothisnow() {
  var pull = document.getElementById('PullupServices_popup');
  pull.style.top     = document.getElementById('scrollpart').offsetTop + "px";
  pull.style.display = "block";
}
function closePullup() {
  document.getElementById('PullupServices_popup').style.display = "none";
}

function showMenschen() {
  var html = "<table><tr><th>Vorname</th><th>Nachname</th><th>Gender</th><th>Rolle</th></tr>";
  var alle = window.Menschen.Menschen;
  for (var i = 0; i < alle.length; i++) {
    var p = alle[i];
    html += "<tr><td>" + p.Vorname + "</td><td>" + p.Nachname +
            "</td><td>" + p.Gender + "</td><td>" + p.Rolle + "</td></tr>";
  }
  html += "</table>";
  showInPopup("Leute", html);
}

function showWikipedia(searchTerm) {
  console.log("showWikipedia: " + searchTerm);
  showInPopup("Wikipedia: " + searchTerm, "<p>Lade…</p>");

  var proxyUrl =
    "http://localhost:6001/proxy/?url=" +
    "https://de.wikipedia.org/w/api.php" +
    "?action=query" +
    "&generator=prefixsearch" +
    "&gpslimit=4" +
    "&format=json" +
    "&prop=extracts|description" +
    "&exintro=1" +
    "&explaintext=1" +
    "&exsentences=3" +
    "&gpssearch=" + encodeURIComponent(searchTerm);

  console.log("Proxy-URL:", proxyUrl);

  var xhReq = new XMLHttpRequest();
  xhReq.open("GET", proxyUrl, true);

  xhReq.onload = function () {
    if (xhReq.status !== 200) {
      showInPopup("Wikipedia: " + searchTerm, "<p>HTTP-Fehler " + xhReq.status + "</p>");
      return;
    }

    console.log("Raw response:", xhReq.responseText.substring(0, 300));

    // Prüfen ob Proxy einen Wrapper liefert oder direkt JSON
    var wikipedia;
    try {
      var parsed = JSON.parse(xhReq.responseText);

      if (parsed.response && parsed.response.query) {
        wikipedia = parsed.response;
      }
      else if (parsed.query) {
        wikipedia = parsed;
      }
      else {
        console.error("Proxy-Fehler:", parsed);
        showInPopup("Wikipedia: " + searchTerm,
          "<p>Proxy-Fehler.<br>Rohantwort: <code>" +
          xhReq.responseText.substring(0, 200) + "</code></p>");
        return;
      }
    } catch (e) {
      console.error("Parse error:", e);
      showInPopup("Wikipedia: " + searchTerm, "<p>Antwort konnte nicht gelesen werden.</p>");
      return;
    }

    console.log("Wikipedia data:", wikipedia);

    if (!wikipedia.query || !wikipedia.query.pages) {
      showInPopup("Wikipedia: " + searchTerm,
        "<p>Keine Ergebnisse für <strong>" + searchTerm + "</strong>.</p>");
      return;
    }

    var pages = Object.values(wikipedia.query.pages);
    var html = "<table><tr>" +
      "<th>Titel</th><th>Beschreibung</th><th>Kurztext</th><th>Link</th>" +
      "</tr>";

    for (var i = 0; i < pages.length; i++) {
      var w           = pages[i];
      var titel       = w.title       || "(kein Titel)";
      var description = w.description || "-";
      var extract     = w.extract     || "-";
      var wikiLink    = "https://de.wikipedia.org/wiki/" +
                        encodeURI(titel.replace(/ /g, "_"));

      html += "<tr>" +
        "<td>" + titel + "</td>" +
        "<td>" + description + "</td>" +
        "<td>" + extract + "</td>" +
        "<td><a href='" + wikiLink + "' target='_blank'>→ öffnen</a></td>" +
        "</tr>";
    }
    html += "</table>";
    showInPopup("Wikipedia: " + searchTerm, html);
  };

  xhReq.onerror = function () {
    showInPopup("Wikipedia: " + searchTerm,
      "<p>Netzwerkfehler – ist der Proxy unter localhost:6001 erreichbar?</p>");
  };

  xhReq.send(null);
}

function showInPopup(titel, htmlContent) {
  var titleEl = document.querySelector('#showwindow .popup-title');
  if (titleEl) { titleEl.textContent = titel; }
  document.getElementById('showwindowData').innerHTML = htmlContent;
  document.getElementById('showwindow').style.display = "block";
  document.getElementById('showwindow').style.top     = "50%";
}

function closeShowwindow() {
  document.getElementById('showwindow').style.display = "none";
}