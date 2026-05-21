"use strict";

function Init() {

    var daten = '{ "Liste" : [' +
        ' { "Vorname" : "Peter",   "Nachname" : "Müller",    "Gender" : "male",   "Rolle" : "Student"   },' +
        ' { "Vorname" : "Susanne", "Nachname" : "Lehmann",   "Gender" : "female", "Rolle" : "Studentin" },' +
        ' { "Vorname" : "Jürgen",  "Nachname" : "Schneider", "Gender" : "male",   "Rolle" : "Dozent"    },' +
        ' { "Vorname" : "Adi",     "Nachname" : "Mustermann","Gender" : "male",   "Rolle" : "Student"   }' +
        ' ] }';
    window.Personen = JSON.parse(daten);

    document.getElementById('PullupServices').addEventListener('click', oeffneDienste);
    document.getElementById('btnClosePullup').addEventListener('click', schliesseDienste);
    document.getElementById('btnLeute').addEventListener('click', zeigePersonen);
    document.getElementById('btnCloseShow').addEventListener('click', schliesseDaten);

    document.getElementById('btnWikipedia').addEventListener('click', function() {
        var suchbegriff = document.getElementById('wikiSearchInput').value.trim();
        if (suchbegriff) {
            sucheWikipedia(suchbegriff);
        }
    });

    document.getElementById('wikiSearchInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            var suchbegriff = this.value.trim();
            if (suchbegriff) {
                sucheWikipedia(suchbegriff);
            }
        }
    });
}

function oeffneDienste() {
    var popup = document.getElementById('PullupServices_popup');
    popup.style.top = document.getElementById('scrollpart').offsetTop + "px";
    popup.style.display = "block";
}

function schliesseDienste() {
    document.getElementById('PullupServices_popup').style.display = "none";
}

function zeigePersonen() {
    var allePersonen = window.Personen.Liste;
    var tabelle = "<table>";
    tabelle += "<tr><th>Vorname</th><th>Nachname</th><th>Gender</th><th>Rolle</th></tr>";

    for (var i = 0; i < allePersonen.length; i++) {
        var person = allePersonen[i];
        tabelle += "<tr>";
        tabelle += "<td>" + person.Vorname  + "</td>";
        tabelle += "<td>" + person.Nachname + "</td>";
        tabelle += "<td>" + person.Gender   + "</td>";
        tabelle += "<td>" + person.Rolle    + "</td>";
        tabelle += "</tr>";
    }
    tabelle += "</table>";

    zeigeDaten("Leute", tabelle);
}

function sucheWikipedia(suchbegriff) {
    zeigeDaten("Wikipedia: " + suchbegriff, "<p>Lade...</p>");

    var url = "http://localhost:4012/proxy/?url=https://de.wikipedia.org/w/api.php" +
              "?action=query" +
              "&generator=prefixsearch" +
              "&gpslimit=4" +
              "&format=json" +
              "&prop=extracts|description" +
              "&exintro=1" +
              "&explaintext=1" +
              "&exsentences=3" +
              "&gpssearch=" + encodeURIComponent(suchbegriff);

    var anfrage = new XMLHttpRequest();
    anfrage.open("GET", url, true);

    anfrage.onload = function() {

        if (anfrage.status !== 200) {
            zeigeDaten("Wikipedia: " + suchbegriff, "<p>Fehler: HTTP " + anfrage.status + "</p>");
            return;
        }

        var wiki;
        try {
            var rohdaten = JSON.parse(anfrage.responseText);

            if (rohdaten.response && rohdaten.response.query) {
                wiki = rohdaten.response;
            } else if (rohdaten.query) {
                wiki = rohdaten;
            } else {
                zeigeDaten("Wikipedia: " + suchbegriff, "<p>Unerwartete Antwort vom Proxy.</p>");
                return;
            }
        } catch (fehler) {
            zeigeDaten("Wikipedia: " + suchbegriff, "<p>Antwort konnte nicht gelesen werden.</p>");
            return;
        }

        if (!wiki.query || !wiki.query.pages) {
            zeigeDaten("Wikipedia: " + suchbegriff,
                "<p>Keine Ergebnisse fuer <strong>" + suchbegriff + "</strong> gefunden.</p>");
            return;
        }

        var seiten = Object.values(wiki.query.pages);
        var tabelle = "<table>";
        tabelle += "<tr><th>Titel</th><th>Beschreibung</th><th>Kurztext</th><th>Link</th></tr>";

        for (var i = 0; i < seiten.length; i++) {
            var seite        = seiten[i];
            var titel        = seite.title       || "(kein Titel)";
            var beschreibung = seite.description || "-";
            var kurztext     = seite.extract     || "-";
            var link         = "https://de.wikipedia.org/wiki/" + encodeURI(titel.replace(/ /g, "_"));

            tabelle += "<tr>";
            tabelle += "<td>" + titel + "</td>";
            tabelle += "<td>" + beschreibung + "</td>";
            tabelle += "<td>" + kurztext + "</td>";
            tabelle += "<td><a href='" + link + "' target='_blank'>" + link + "</a></td>";
            tabelle += "</tr>";
        }
        tabelle += "</table>";

        zeigeDaten("Wikipedia: " + suchbegriff, tabelle);
    };

    anfrage.onerror = function() {
        zeigeDaten("Wikipedia: " + suchbegriff, "<p>Netzwerkfehler beim Verbinden mit dem Proxy.</p>");
    };

    anfrage.send(null);
}

function zeigeDaten(titel, inhalt) {
    var titelElement = document.querySelector('#showwindow .popup-title');
    if (titelElement) {
        titelElement.textContent = titel;
    }
    document.getElementById('showwindowData').innerHTML = inhalt;
    document.getElementById('showwindow').style.display = "block";
    document.getElementById('showwindow').style.top = "8%";
}

function schliesseDaten() {
    document.getElementById('showwindow').style.display = "none";
}