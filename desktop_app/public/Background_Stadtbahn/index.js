/**
 * STUTTGART STADTBAHN RADAR
 * Fixes: Doppelte Züge, Linien-bewusstes Station-Lookup, Trip-Deduplication, Zeitfenster
 */

// ─── KONFIGURATION ────────────────────────────────────────────────────────────

// Wird per loadStations() aus den JSON-Dateien befüllt (siehe STATION_FILES in index.html)
let stations = [];

// Bisherige hardcodierte Stationen als Fallback, falls keine JSON-Dateien angegeben –
// kann gelöscht werden sobald alle Linien als .json vorliegen.
const STATIONS_FALLBACK = [
  {
    "name": "Plieningen",
    "stopId": "de:08111:6555",
    "lines": ["U3"],
    "nextIn": "de:08111:6352",
    "nextOut": null,
    "pctX": 0.50604,
    "pctY": 0.90395
  },
  {
    "name": "Landhaus",
    "stopId": "de:08111:6352",
    "lines": ["U3"],
    "nextIn": "de:08111:360",
    "nextOut": "de:08111:6555",
    "pctX": 0.4877,
    "pctY": 0.87136
  },
  {
    "name": "Salzäcker",
    "stopId": "de:08111:360",
    "lines": ["U3"],
    "nextIn": "de:08111:353",
    "nextOut": "de:08111:6352",
    "pctX": 0.46958,
    "pctY": 0.83914
  },
  {
    "name": "Plieninger Straße",
    "stopId": "de:08111:353",
    "lines": ["U3"],
    "nextIn": "de:08111:354",
    "nextOut": "de:08111:360",
    "pctX": 0.45146,
    "pctY": 0.80692
  },
  {
    "name": "Sigmaringer Straße",
    "stopId": "de:08111:354",
    "lines": ["U3"],
    "nextIn": "de:08111:6169",
    "nextOut": "de:08111:353",
    "pctX": 0.43336,
    "pctY": 0.77474
  },
  {
    "name": "Möhringen Bahnhof",
    "stopId": "de:08111:6169",
    "lines": ["U3"],
    "nextIn": "de:08111:170",
    "nextOut": "de:08111:354",
    "pctX": 0.4025,
    "pctY": 0.74288
  },
  {
    "name": "Vaihinger Straße",
    "stopId": "de:08111:170",
    "lines": ["U3"],
    "nextIn": "de:08111:350",
    "nextOut": "de:08111:6169",
    "pctX": 0.3805,
    "pctY": 0.74288
  },
  {
    "name": "SSB-Zentrum",
    "stopId": "de:08111:350",
    "lines": ["U3"],
    "nextIn": "de:08111:355",
    "nextOut": "de:08111:170",
    "pctX": 0.35159,
    "pctY": 0.74288
  },
  {
    "name": "Wallgraben",
    "stopId": "de:08111:355",
    "lines": ["U3"],
    "nextIn": "de:08111:356",
    "nextOut": "de:08111:350",
    "pctX": 0.32446,
    "pctY": 0.74288
  },
  {
    "name": "Jurastr",
    "stopId": "de:08111:356",
    "lines": ["U3"],
    "nextIn": "de:08111:6002",
    "nextOut": "de:08111:355",
    "pctX": 0.29725,
    "pctY": 0.74288
  },
  {
    "name": "Vaihingen Bf",
    "stopId": "de:08111:6002",
    "lines": ["U3"],
    "nextIn": null,
    "nextOut": "de:08111:356",
    "pctX": 0.26407,
    "pctY": 0.75102
  },
  {
    "name": "Flughafen/Messe",
    "stopId": "de:08116:2103",
    "lines": ["U6"],
    "nextIn": "de:08116:7182",
    "nextOut": "",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.33687007789690593,
    "pctY": 0.9185762116842322
  },
  {
    "name": "Messe West",
    "stopId": "de:08116:7182",
    "lines": ["U6"],
    "nextIn": "de:08116:7180",
    "nextOut": "de:08116:2103",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.33687007789690593,
    "pctY": 0.8987002780217432
  },
  {
    "name": "Stadionstraße",
    "stopId": "de:08116:7180",
    "lines": ["U6"],
    "nextIn": "de:08111:363",
    "nextOut": "de:08116:7182",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.3369590902162109,
    "pctY": 0.8806283701853083
  },
  {
    "name": "Schelmenwasen",
    "stopId": "de:08111:363",
    "lines": ["U6"],
    "nextIn": "de:08111:2586",
    "nextOut": "de:08116:7180",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.33694128775234994,
    "pctY": 0.8629995564114128
  },
  {
    "name": "EnBW City",
    "stopId": "de:08111:2586",
    "lines": ["U6"],
    "nextIn": "de:08111:2584",
    "nextOut": "de:08111:363",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.33694128775234994,
    "pctY": 0.8452757939098303
  },
  {
    "name": "Europaplatz",
    "stopId": "de:08111:2584",
    "lines": ["U6"],
    "nextIn": "de:08111:364",
    "nextOut": "de:08111:2586",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.33694128775234994,
    "pctY": 0.8275520314082478
  },
  {
    "name": "Fasanenhof",
    "stopId": "de:08111:364",
    "lines": ["U6"],
    "nextIn": "de:08111:6171",
    "nextOut": "de:08111:2584",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.33694128775234994,
    "pctY": 0.8095750722995
  },
  {
    "name": "Möhringen Freibad",
    "stopId": "de:08111:6171",
    "lines": ["U6"],
    "nextIn": "de:08111:183",
    "nextOut": "de:08111:364",
    "waypointIn": { "pctX": 0.33672765818601796, "pctY": 0.7943832758695721 },
    "waypointOut": { "pctX": 0.33672765818601796, "pctY": 0.7943832758695721 },
    "pctX": 0.3389351637047817,
    "pctY": 0.7908385233692556
  },
  {
    "name": "Rohrer Weg",
    "stopId": "de:08111:183",
    "lines": ["U6"],
    "nextIn": "de:08111:170",
    "nextOut": "de:08111:6171",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.3523582214559745,
    "pctY": 0.7669747431439107
  },
  {
    "name": "Vaihinger Straße",
    "stopId": "de:08111:170",
    "lines": ["U6"],
    "nextIn": "de:08111:6169",
    "nextOut": "de:08111:183",
    "waypointIn": { "pctX": 0.3771748560782062, "pctY": 0.723108430952494 },
    "waypointOut": { "pctX": 0.3771748560782062, "pctY": 0.723108430952494 },
    "pctX": 0.38030808971774194,
    "pctY": 0.723108430952494
  },
  {
    "name": "Möhringen Bahnhof",
    "stopId": "de:08111:6169",
    "lines": ["U6"],
    "nextIn": "de:08111:6168",
    "nextOut": "de:08111:170",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.40224072519449194,
    "pctY": 0.723108430952494
  },
  {
    "name": "Riedsee",
    "stopId": "de:08111:6168",
    "lines": ["U6"],
    "nextIn": "de:08111:6167",
    "nextOut": "de:08111:6169",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.42426831873531295,
    "pctY": 0.723108430952494
  },
  {
    "name": "Sonnenberg",
    "stopId": "de:08111:6167",
    "lines": ["U6"],
    "nextIn": "de:08111:6166",
    "nextOut": "de:08111:6168",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.4464976503529339,
    "pctY": 0.723108430952494
  },
  {
    "name": "Peregrina Straße",
    "stopId": "de:08111:6166",
    "lines": ["U6"],
    "nextIn": "de:08111:2594",
    "nextOut": "de:08111:6167",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.4685727055405718,
    "pctY": 0.723108430952494
  },
  {
    "name": "Degerloch Albstraße",
    "stopId": "de:08111:2594",
    "lines": ["U6"],
    "nextIn": "de:08111:6165",
    "nextOut": "de:08111:6166",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.4905884423622979,
    "pctY": 0.723108430952494
  },
  {
    "name": "Degerloch",
    "stopId": "de:08111:6165",
    "lines": ["U6"],
    "nextIn": "de:08111:163",
    "nextOut": "de:08111:2594",
    "waypointIn": { "pctX": 0.49501531011892047, "pctY": 0.723108430952494 },
    "waypointOut": { "pctX": 0.49501531011892047, "pctY": 0.723108430952494 },
    "pctX": 0.5022075055187638,
    "pctY": 0.7105751988978035
  },
  {
    "name": "Weinsteige",
    "stopId": "de:08111:163",
    "lines": ["U6"],
    "nextIn": "de:08111:6160",
    "nextOut": "de:08111:6165",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.5205262408317312,
    "pctY": 0.6780077853011457
  },
  {
    "name": "Bopser",
    "stopId": "de:08111:6160",
    "lines": ["U6"],
    "nextIn": "de:08111:159",
    "nextOut": "de:08111:163",
    "waypointIn": { "pctX": 0.5238196966460158, "pctY": 0.672089314608653 },
    "waypointOut": { "pctX": 0.5238196966460158, "pctY": 0.672089314608653 },
    "pctX": 0.5236060670796838,
    "pctY": 0.627653310051114
  },
  {
    "name": "Dobelstraße",
    "stopId": "de:08111:159",
    "lines": ["U6"],
    "nextIn": "de:08111:6119",
    "nextOut": "de:08111:6160",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.5236060670796838,
    "pctY": 0.5791661597789277
  },
  {
    "name": "Olgaeck",
    "stopId": "de:08111:6119",
    "lines": ["U6"],
    "nextIn": "de:08111:6075",
    "nextOut": "de:08111:159",
    "waypointIn": { "pctX": 0.5238909065014598, "pctY": 0.5628349477089664 },
    "waypointOut": { "pctX": 0.5238909065014598, "pctY": 0.5628349477089664 },
    "pctX": 0.5073702200384533,
    "pctY": 0.5339705344921034
  },
  {
    "name": "Charlottenplatz",
    "stopId": "de:08111:6075",
    "lines": ["U6"],
    "nextIn": "de:08111:6022",
    "nextOut": "de:08111:6119",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.4846186712240974,
    "pctY": 0.49352237649742053
  },
  {
    "name": "Schlossplatz",
    "stopId": "de:08111:6022",
    "lines": ["U6"],
    "nextIn": "de:08111:6112",
    "nextOut": "de:08111:6075",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.46881008331553087,
    "pctY": 0.46541755310205407
  },
  {
    "name": "Hauptbahnhof",
    "stopId": "de:08111:6112",
    "lines": ["U6"],
    "nextIn": "de:08111:6116",
    "nextOut": "de:08111:6022",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.45485295164850814,
    "pctY": 0.4406042855998386
  },
  {
    "name": "Stadtbibliothek",
    "stopId": "de:08111:6116",
    "lines": ["U6"],
    "nextIn": "de:08111:115",
    "nextOut": "de:08111:6112",
    "waypointIn": { "pctX": 0.44859834108853164, "pctY": 0.4291471391256013 },
    "waypointOut": { "pctX": 0.44859834108853164, "pctY": 0.4291471391256013 },
    "pctX": 0.4485271312330877,
    "pctY": 0.34306029268934357
  },
  {
    "name": "Pragfriedhof",
    "stopId": "de:08111:115",
    "lines": ["U6"],
    "nextIn": "de:08111:6114",
    "nextOut": "de:08111:6116",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.4485271312330877,
    "pctY": 0.28634425268427965
  },
  {
    "name": "Löwentorbrücke",
    "stopId": "de:08111:6114",
    "lines": ["U6"],
    "nextIn": "de:08111:6113",
    "nextOut": "de:08111:115",
    "waypointIn": { "pctX": 0.4484559213776437, "pctY": 0.27583660894080736 },
    "waypointOut": { "pctX": 0.4484559213776437, "pctY": 0.27583660894080736 },
    "pctX": 0.4635524107317703,
    "pctY": 0.24874457197410274
  },
  {
    "name": "Pragsattel",
    "stopId": "de:08111:6113",
    "lines": ["U6"],
    "nextIn": "de:08111:158",
    "nextOut": "de:08111:6114",
    "waypointIn": { "pctX": 0.488891262550737, "pctY": 0.20329578098790194 },
    "waypointOut": { "pctX": 0.488891262550737, "pctY": 0.20329578098790194 },
    "pctX": 0.48874884283984904,
    "pctY": 0.19367430991561432
  },
  {
    "name": "Maybachstraße",
    "stopId": "de:08111:158",
    "lines": ["U6"],
    "nextIn": "de:08111:6157",
    "nextOut": "de:08111:6113",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.4662465285195471,
    "pctY": 0.1937376090674057
  },
  {
    "name": "Feuerbach",
    "stopId": "de:08111:6157",
    "lines": ["U6"],
    "nextIn": "de:08111:6180",
    "nextOut": "de:08111:158",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.43784565291648864,
    "pctY": 0.1937376090674057
  },
  {
    "name": "Wilhelm-Geiger-Platz",
    "stopId": "de:08111:6180",
    "lines": ["U6"],
    "nextIn": "de:08111:154",
    "nextOut": "de:08111:6157",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.40739158299508654,
    "pctY": 0.1937376090674057
  },
  {
    "name": "Föhrich",
    "stopId": "de:08111:154",
    "lines": ["U6"],
    "nextIn": "de:08111:153",
    "nextOut": "de:08111:6180",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.37737662892544327,
    "pctY": 0.1937376090674057
  },
  {
    "name": "Sportpark Feuerbach",
    "stopId": "de:08111:153",
    "lines": ["U6"],
    "nextIn": "de:08111:6157",
    "nextOut": "de:08111:154",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.3471005836426511,
    "pctY": 0.1937376090674057
  },
  {
    "name": "Feuerbach Pfostenwäldle",
    "stopId": "de:08111:6157",
    "lines": ["U6"],
    "nextIn": "de:08111:151",
    "nextOut": "de:08111:153",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.3169787974046233,
    "pctY": 0.1937376090674057
  },
  {
    "name": "Landauer Straße",
    "stopId": "de:08111:151",
    "lines": ["U6"],
    "nextIn": "de:08111:6149",
    "nextOut": "de:08111:6157",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.29040566460491885,
    "pctY": 0.1937376090674057
  },
  {
    "name": "Weilimdorf Löwen-Markt",
    "stopId": "de:08111:6149",
    "lines": ["U6"],
    "nextIn": "de:08111:148",
    "nextOut": "de:08111:151",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.2638206403156822,
    "pctY": 0.1937376090674057
  },
  {
    "name": "Rastatter Straße",
    "stopId": "de:08111:148",
    "lines": ["U6"],
    "nextIn": "de:08111:147",
    "nextOut": "de:08111:6149",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.23715254945190664,
    "pctY": 0.19354771161203158
  },
  {
    "name": "Wolfbusch",
    "stopId": "de:08111:147",
    "lines": ["U6"],
    "nextIn": "de:08111:146",
    "nextOut": "de:08111:148",
    "waypointIn": { "pctX": 0.23391250102920494, "pctY": 0.19380090821919704 },
    "waypointOut": { "pctX": 0.23391250102920494, "pctY": 0.19380090821919704 },
    "pctX": 0.22294618329082996,
    "pctY": 0.2134236452745205
  },
  {
    "name": "Bergheimer Hof",
    "stopId": "de:08111:146",
    "lines": ["U6"],
    "nextIn": "de:08111:145",
    "nextOut": "de:08111:147",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.20884663191291924,
    "pctY": 0.23849010938390144
  },
  {
    "name": "Salamanderweg",
    "stopId": "de:08111:145",
    "lines": ["U6"],
    "nextIn": "de:08111:144",
    "nextOut": "de:08111:146",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.19442663618551057,
    "pctY": 0.2641262658594047
  },
  {
    "name": "Giebel",
    "stopId": "de:08111:144",
    "lines": ["U6"],
    "nextIn": "de:08118:143",
    "nextOut": "de:08111:145",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.18025587495215586,
    "pctY": 0.28931932827236834
  },
  {
    "name": "Breitwiesen",
    "stopId": "de:08118:143",
    "lines": ["U6"],
    "nextIn": "de:08116:2970",
    "nextOut": "de:08111:144",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.16604951748368849,
    "pctY": 0.31457567438322886
  },
  {
    "name": "Siedlung",
    "stopId": "de:08116:2970",
    "lines": ["U6"],
    "nextIn": "de:08118:7140",
    "nextOut": "de:08118:143",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.1518075463948898,
    "pctY": 0.33989533509977526
  },
  {
    "name": "Gerlingen",
    "stopId": "de:08118:7140",
    "lines": ["U6"],
    "nextIn": null,
    "nextOut": "de:08116:2970",
    "waypointIn": null,
    "waypointOut": null,
    "pctX": 0.13614137819721125,
    "pctY": 0.36774696188797634
  }
]; // Ende STATIONS_FALLBACK

// ─── KONSTANTEN ───────────────────────────────────────────────────────────────

// FIX 1: Vollständigere Richtungserkennung
const INBOUND_DESTINATIONS = [
    "hauptbahnhof", "stadtmitte", "charlottenplatz", "schlossplatz",
    "vaihingen", "ostfildern", "fasanenhof", "dürener", "prien",
    "nellingen", "innenstadt", "stadtbibliothek", "pragsattel",
    "feuerbach", "gerlingen"
];

const LINE_COLORS = {
    "U1": "#e30613", "U2": "#009640", "U3": "#955C36",
    "U4": "#af5836", "U5": "#007abf", "U6": "#E6007E",
    "U7": "#f39200", "U8": "#007abf", "U9": "#af5836",
    "U11": "#e30613", "U12": "#f39200", "U13": "#009640",
    "U14": "#af5836", "U15": "#e30613", "U19": "#007abf",
    "U21": "#e30613", "U24": "#009640"
};

// Zeitfenster: Abfahrten die älter als X ms oder weiter als Y ms entfernt sind, ignorieren
const WINDOW_PAST_MS   = 600_000;  // 10 Minuten in die Vergangenheit
const WINDOW_FUTURE_MS = 900_000;  // 15 Minuten in die Zukunft
const TRAVEL_TIME_MS   = 110_000;  // Standard-Fahrzeit zwischen Stationen

// ─── CANVAS SETUP ─────────────────────────────────────────────────────────────

const canvas = document.getElementById('mapCanvas');
const ctx    = canvas.getContext('2d');
const img    = document.getElementById('mapImage');

// ─── STATE ────────────────────────────────────────────────────────────────────

// FIX 2: Map speichert jetzt das "beste" (aktuellste) Sighting pro Trip
// key: tripId  →  value: simulation object
let activeSimulations = new Map();

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchVVS(stopId) {
    try {
        // limit=30 statt 10: stellt sicher dass auch bei belebten Stationen
        // alle relevanten Linien in der Antwort enthalten sind
        const url = `https://www3.vvs.de/mngvvs/XML_DM_REQUEST?outputFormat=rapidJSON&type_dm=any&name_dm=${stopId}&mode=direct&useRealtime=1&limit=30&t=${Date.now()}`;
        const res  = await fetch(url);
        const data = await res.json();
        const list = data.stopEvents || data.departures || [];

        return list
            .filter(e => e?.transportation?.disassembledName)
            .map(e => {
                const plannedMs = new Date(
                    e.departureTimePlanned || e.arrivalTimePlanned
                ).getTime();

                return {
                    line: e.transportation.disassembledName,
                    dest: (e.transportation.destination?.name || '').toLowerCase(),
                    time: new Date(
                        e.departureTimeEstimated ||
                        e.departureTimePlanned   ||
                        e.arrivalTimeEstimated   ||
                        e.arrivalTimePlanned
                    ),
                    tripId: e.transportation.id
                        ? `${e.transportation.disassembledName}_${e.transportation.id}`
                        : `${e.transportation.disassembledName}_${e.transportation.destination?.name}_${Math.round(plannedMs / 300_000)}`
                };
            });
    } catch {
        console.warn(`API-Fehler bei ${stopId}`);
        return [];
    }
}

// ─── HILFSFUNKTIONEN ──────────────────────────────────────────────────────────

/**
 * FIX 4: Linien-bewusstes Stationssuche
 * Stationen wie "Vaihinger Straße" existieren für U3 UND U6 mit gleicher stopId –
 * ohne Linienbeschränkung würde immer der erste Eintrag gefunden.
 */
function findNextStation(nextStopId, line) {
    if (!nextStopId) return null;
    // Zuerst: exakter Match mit richtiger Linie
    return stations.find(s => s.stopId === nextStopId && s.lines?.includes(line))
        // Fallback: nur stopId (für Fälle ohne Linieninfo)
        ?? stations.find(s => s.stopId === nextStopId)
        ?? null;
}

function getTravelTime(stationA) {
    return stationA.travelTimeNext != null
        ? stationA.travelTimeNext * 1000   // Sekunden → Millisekunden
        : TRAVEL_TIME_MS;
}

// ─── HAUPTLOGIK ───────────────────────────────────────────────────────────────

async function updateEntireNetwork() {
    console.log("📡 Synchronisiere mit VVS...");
    const now = Date.now();

    // FIX 5: Erst ALLE Sightings sammeln, dann das aktuellste pro Trip behalten
    // key: tripId  →  {dep, station, isInbound, nextStation, score}
    const bestSighting = new Map();

    for (const station of stations) {
        const departures = await fetchVVS(station.stopId);

        for (const dep of departures) {
            // Nur Abfahrten der zugewiesenen Linien dieser Station
            if (!station.lines?.includes(dep.line)) continue;

            const depTime = dep.time.getTime();

            // Zeitfenster
            if (depTime < now - WINDOW_PAST_MS || depTime > now + WINDOW_FUTURE_MS) continue;

            // Richtung bestimmen – falls primäre Richtung kein nextStation liefert,
            // automatisch die andere Richtung probieren
            let isInbound = INBOUND_DESTINATIONS.some(t => dep.dest.includes(t));
            let nextId    = isInbound ? station.nextIn : station.nextOut;
            let nextStation = findNextStation(nextId, dep.line);

            if (!nextStation) {
                // Andere Richtung versuchen
                isInbound  = !isInbound;
                nextId     = isInbound ? station.nextIn : station.nextOut;
                nextStation = findNextStation(nextId, dep.line);
            }

            if (!nextStation) {
                console.debug(`⚠️ Kein Segment: ${dep.line} → "${dep.dest}" @ ${station.name}`);
                continue;
            }

            // Nur Abfahrten berücksichtigen wo der Zug bereits abgefahren ist
            // (+ 15 Sek Toleranz für Echtzeit-Ungenauigkeiten der API).
            // Zukünftige Stationen werden ignoriert – der Zug ist dort noch nicht.
            if (depTime > now + 15_000) continue;

            // Score: je später die Abfahrt (je weiter vorne auf der Route), desto besser
            const score = depTime;

            const existing = bestSighting.get(dep.tripId);
            if (!existing || score > existing.score) {
                bestSighting.set(dep.tripId, { dep, station, isInbound, nextStation, score });
            }
        }

        // Kleine Pause, damit die API nicht überlastet wird
        await new Promise(r => setTimeout(r, 50));
    }

    // ── Simulationen aktualisieren ────────────────────────────────────────────

    const freshIds = new Set();

    bestSighting.forEach(({ dep, station, isInbound, nextStation }, tripId) => {
        freshIds.add(tripId);
        const depTime = dep.time.getTime();
        const waypoint = isInbound ? station.waypointIn : station.waypointOut;

        if (!activeSimulations.has(tripId)) {
            // Neuen Zug hinzufügen
            activeSimulations.set(tripId, {
                line:         dep.line,
                isInbound,
                startStation: station,
                endStation:   nextStation,
                startTime:    depTime,
                duration:     getTravelTime(station),
                waypoint
            });
        } else {
            // Bestehendes Sighting nur updaten wenn der Zug
            // zur nächsten Strecke weitergezogen ist (neues Stationspaar)
            const sim = activeSimulations.get(tripId);
            const hasMoved   = sim.startStation.stopId !== station.stopId;
            const isFinished = (now - sim.startTime) > sim.duration * 0.95;

            if (hasMoved && isFinished) {
                activeSimulations.set(tripId, {
                    line:         dep.line,
                    isInbound,
                    startStation: station,
                    endStation:   nextStation,
                    startTime:    depTime,
                    duration:     getTravelTime(station),
                    waypoint
                });
            }
        }
    });

    // Veraltete Simulationen entfernen:
    // - Nicht mehr in der API UND älter als 2× Fahrzeit → Geist-Zug
    // - Älter als 30 Minuten → definitiv veraltet
    for (const [id, sim] of activeSimulations) {
        const elapsed   = now - sim.startTime;
        const isMissing = !freshIds.has(id);
        const isGhost   = isMissing && elapsed > sim.duration * 2;
        const isStale   = elapsed > 30 * 60 * 1000;

        if (isGhost || isStale) {
            activeSimulations.delete(id);
            if (isGhost) console.debug(`🗑 Geist-Zug entfernt: ${id.substring(0, 50)}`);
        }
    }

    console.log(`✅ ${activeSimulations.size} aktive Züge`);
}

// ─── RENDERING ────────────────────────────────────────────────────────────────

function draw() {
    if (!canvas.width || !img.complete) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = Date.now();

    for (const [id, train] of activeSimulations) {
        const elapsed  = now - train.startTime;
        const progress = elapsed / train.duration;

        // Segment abgeschlossen → nächstes Segment laden (Chaining)
        if (progress >= 1.0) {
            const advanced = advanceSegment(id, train);
            if (!advanced) {
                // Endstation erreicht, kein weiteres Segment → entfernen
                activeSimulations.delete(id);
            }
            continue; // Neu geladenes Segment wird im nächsten Frame gezeichnet
        }

        if (progress < 0) continue; // Zug noch nicht abgefahren

        // Nur am echten Streckenanfang sanft einblenden, kein vorzeitiges Ausblenden
        const alpha = progress < 0.08 ? progress / 0.08 : 1.0;

        const t   = Math.min(1, Math.max(0, progress));
        const pos = getPosition(train.startStation, train.endStation, train.waypoint, t);
        drawMarker(pos.x * canvas.width, pos.y * canvas.height, train.line, alpha);
    }
}

/**
 * Zug auf das nächste Segment weiterschalten.
 * Gibt true zurück wenn ein nächstes Segment gefunden wurde, sonst false.
 */
function advanceSegment(id, sim) {
    const { endStation, line, isInbound, startTime, duration } = sim;
    const nextStopId  = isInbound ? endStation.nextIn : endStation.nextOut;
    const nextStation = findNextStation(nextStopId, line);

    if (!nextStation) return false; // Endstation der Linie

    const waypoint = isInbound ? endStation.waypointIn : endStation.waypointOut;

    activeSimulations.set(id, {
        line,
        isInbound,
        startStation: endStation,
        endStation:   nextStation,
        // startTime vom Ende des vorherigen Segments übernehmen → nahtloser Übergang
        startTime:    startTime + duration,
        duration:     getTravelTime(endStation),
        waypoint
    });

    return true;
}

function drawMarker(x, y, line, alpha) {
    const color = LINE_COLORS[line] || "#999";
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    ctx.shadowBlur  = 15;
    ctx.shadowColor = color;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur   = 0;
    ctx.strokeStyle  = "white";
    ctx.lineWidth    = 2;
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.font      = "bold 10px Arial";
    ctx.fillText(line, x + 10, y + 4);

    ctx.restore();
}

// ─── POSITION (Waypoint-Routing) ──────────────────────────────────────────────

function getPosition(sA, sB, wp, t) {
    if (!wp) {
        return {
            x: sA.pctX + (sB.pctX - sA.pctX) * t,
            y: sA.pctY + (sB.pctY - sA.pctY) * t
        };
    }
    if (t < 0.5) {
        const st = t * 2;
        return {
            x: sA.pctX + (wp.pctX - sA.pctX) * st,
            y: sA.pctY + (wp.pctY - sA.pctY) * st
        };
    } else {
        const st = (t - 0.5) * 2;
        return {
            x: wp.pctX + (sB.pctX - wp.pctX) * st,
            y: wp.pctY + (sB.pctY - wp.pctY) * st
        };
    }
}

// ─── RESIZE & START ───────────────────────────────────────────────────────────

function resize() {
    canvas.width  = img.clientWidth;
    canvas.height = img.clientHeight;
}

/**
 * Lädt alle JSON-Dateien aus STATION_FILES (definiert in index.html) und merged sie.
 * Jede Datei kann ein reines Array sein: [ {...}, {...} ]
 * oder ein Objekt mit stations-Key:      { "stations": [ {...}, {...} ] }
 */
async function loadStations() {
    const files = (typeof STATION_FILES !== 'undefined') ? STATION_FILES : [];

    if (files.length === 0) {
        console.warn("⚠️ Keine STATION_FILES definiert – nutze hardcodierten Fallback.");
        stations = STATIONS_FALLBACK;
        return;
    }

    const results = await Promise.all(
        files.map(path =>
            fetch(path)
                .then(r => r.json())
                .catch(() => { console.warn(`⚠️ Konnte ${path} nicht laden`); return []; })
        )
    );
    stations = results.flatMap(r => Array.isArray(r) ? r : (r.stations ?? []));
    console.log(`✅ ${stations.length} Stationen aus ${files.length} Datei(en) geladen`);
}

window.onload = async () => {
    resize();
    await loadStations();          // ← JSON-Dateien laden, dann erst loslegen
    await updateEntireNetwork();
    setInterval(draw, 40);
    setInterval(updateEntireNetwork, 40_000);
};

window.onresize = resize;