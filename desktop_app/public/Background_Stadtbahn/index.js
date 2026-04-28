/**
 * STUTTGART STADTBAHN RADAR - FULL STABLE
 * Features: Single Train per Line, Waypoint Routing, Debugging
 */

// 1. KONFIGURATION & DATEN
let stations = [
  {
    "name": "Plieningen",
    "stopId": "de:08111:6555",
    "lines": [
      "U3"
    ],
    "nextIn": "de:08111:6352",
    "nextOut": null,
    "pctX": 0.50604,
    "pctY": 0.90395
  },
  {
    "name": "Landhaus",
    "stopId": "de:08111:6352",
    "lines": [
      "U3"
    ],
    "nextIn": "de:08111:360",
    "nextOut": "de:08111:6555",
    "pctX": 0.4877,
    "pctY": 0.87136
  },
  {
    "name": "Salzäcker",
    "stopId": "de:08111:360",
    "lines": [
      "U3"
    ],
    "nextIn": "de:08111:353",
    "nextOut": "de:08111:6352",
    "pctX": 0.46958,
    "pctY": 0.83914
  },
  {
    "name": "Plieninger Straße",
    "stopId": "de:08111:353",
    "lines": [
      "U3"
    ],
    "nextIn": "de:08111:354",
    "nextOut": "de:08111:360",
    "pctX": 0.45146,
    "pctY": 0.80692
  },
  {
    "name": "Sigmaringer Straße",
    "stopId": "de:08111:354",
    "lines": [
      "U3"
    ],
    "nextIn": "de:08111:6169",
    "nextOut": "de:08111:353",
    "pctX": 0.43336,
    "pctY": 0.77474
  },
  {
    "name": "Möhringen Bahnhof",
    "stopId": "de:08111:6169",
    "lines": [
      "U3"
    ],
    "nextIn": "de:08111:170",
    "nextOut": "de:08111:354",
    "pctX": 0.4025,
    "pctY": 0.74288
  },
  {
    "name": "Vaihinger Straße",
    "stopId": "de:08111:170",
    "lines": [
      "U3"
    ],
    "nextIn": "de:08111:350",
    "nextOut": "de:08111:6169",
    "pctX": 0.3805,
    "pctY": 0.74288
  },
  {
    "name": "SSB-Zentrum",
    "stopId": "de:08111:350",
    "lines": [
      "U3"
    ],
    "nextIn": "de:08111:355",
    "nextOut": "de:08111:170",
    "pctX": 0.35159,
    "pctY": 0.74288
  },
  {
    "name": "Wallgraben",
    "stopId": "de:08111:355",
    "lines": [
      "U3"
    ],
    "nextIn": "de:08111:356",
    "nextOut": "de:08111:350",
    "pctX": 0.32446,
    "pctY": 0.74288
  },
  {
    "name": "Jurastr",
    "stopId": "de:08111:356",
    "lines": [
      "U3"
    ],
    "nextIn": "de:08111:6002",
    "nextOut": "de:08111:355",
    "pctX": 0.29725,
    "pctY": 0.74288
  },
  {
    "name": "Vaihingen Bf",
    "stopId": "de:08111:6002",
    "lines": [
      "U3"
    ],
    "nextIn": null,
    "nextOut": "de:08111:356",
    "pctX": 0.26407,
    "pctY": 0.75102
  }
]; // Hier kommt dein exportiertes JSON rein

const INBOUND_DESTINATIONS = [
    "hauptbahnhof", "stadtmitte", "charlottenplatz", "schlossplatz", 
    "vaihingen", "ostfildern", "fasanenhof", "dürener", "prien", "nellingen"
];

const FALLBACK_TRAVEL_TIME = 120000; // 90 Sekunden Standard
const DEBUG_MODE = true;

const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');
const img = document.getElementById('mapImage');

const LINE_COLORS = {
    "U1":  "#e30613", // Rot
    "U2":  "#009640", // Grün
    "U3":  "#955C36", // Orange
    "U4":  "#af5836", // Braun
    "U5":  "#007abf", // Blau
    "U6":  "#231f20", // Schwarz/Dunkelgrau
    "U7":  "#f39200", // Hellorange
    "U8":  "#007abf", // Blau
    "U9":  "#af5836", // Braun
    "U11": "#e30613", // Rot (Sonder)
    "U12": "#f39200", // Orange
    "U13": "#009640", // Grün
    "U14": "#af5836", // Braun
    "U15": "#e30613", // Rot
    "U19": "#007abf", // Blau
    "U21": "#e30613", // Rot
    "U24": "#009640"  // Grün
};

const DEFAULT_COLOR = "#999999"; // Fallback Farbe

// 2. API ABFRAGE MIT "NUR EIN ZUG PRO LINIE" FILTER
async function updateEntireNetwork() {
    console.log("📡 Batch-Update startet...");
    
    // 1. Stationen in kleine Gruppen (Batches) aufteilen, z.B. 5 Stationen pro Gruppe
    const batchSize = 5; 
    
    for (let i = 0; i < stations.length; i += batchSize) {
        const batch = stations.slice(i, i + batchSize);
        
        // Führe 5 Anfragen gleichzeitig aus
        await Promise.all(batch.map(async (station) => {
            try {
                // Wir hängen einen Zeitstempel an, um Cache-Probleme zu vermeiden, 
                // fragen aber nur das Nötigste ab (limit=10)
                const url = `https://www3.vvs.de/mngvvs/XML_DM_REQUEST?outputFormat=rapidJSON&type_dm=any&name_dm=${station.stopId}&mode=direct&useRealtime=1&limit=10`;
                
                const response = await fetch(url);
                const data = await response.json();
                const list = data.stopEvents || data.departures || [];

                const allowedLines = station.lines || [];
                station.currentData = list
                    .filter(e => allowedLines.includes(e.transportation.disassembledName))
                    .map(e => ({
                        line: e.transportation.disassembledName,
                        dest: e.transportation.destination.name,
                        time: new Date(e.departureTimeEstimated || e.departureTimePlanned)
                    }));

            } catch (err) {
                console.warn(`Timeout/Fehler bei ${station.name}`);
            }
        }));

        // 2. WICHTIG: Kurze Pause zwischen den Batches (z.B. 300ms)
        // Das schont die API und verhindert Sperren
        await new Promise(r => setTimeout(r, 300));
    }
    console.log("✅ Alle Stationen aktualisiert.");
}

// 3. INTERPOLATION (MIT WAYPOINT-LOGIK)
function getPosition(stationA, stationB, waypoint, progress) {
    // Falls kein Waypoint existiert -> Linear von A nach B
    if (!waypoint) {
        return {
            x: stationA.pctX + (stationB.pctX - stationA.pctX) * progress,
            y: stationA.pctY + (stationB.pctY - stationA.pctY) * progress
        };
    } else {
        // Wegpunkt-Logik: 0.0 - 0.5 zu Waypoint, 0.5 - 1.0 zu Ziel
        if (progress < 0.5) {
            const localProgress = progress * 2; // auf 0-1 skalieren
            return {
                x: stationA.pctX + (waypoint.pctX - stationA.pctX) * localProgress,
                y: stationA.pctY + (waypoint.pctY - stationA.pctY) * localProgress
            };
        } else {
            const localProgress = (progress - 0.5) * 2; // auf 0-1 skalieren
            return {
                x: waypoint.pctX + (stationB.pctX - waypoint.pctX) * localProgress,
                y: waypoint.pctY + (stationB.pctY - waypoint.pctY) * localProgress
            };
        }
    }
}

// 4. FAHRZEIT-BERECHNUNG
function getTravelTime(stationA, stationB, lineName) {
    const fallback = 90000; // 90 Sekunden als solider Durchschnitt
    
    if (!stationB.currentData || !stationA.currentData) return fallback;
    
    const trainA = stationA.currentData.find(d => d.line === lineName);
    const trainB = stationB.currentData.find(d => d.line === lineName);

    if (trainA && trainB) {
        const diff = trainB.time - trainA.time;
        // Nur wenn die Differenz zwischen 20s und 5min liegt, ist sie glaubwürdig
        if (diff >= 20000 && diff <= 300000) return diff;
    }
    return fallback;
}

// 5. ZEICHNEN
function draw() {
    if (!canvas.width || !img.complete) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = new Date();

    stations.forEach(station => {
        if (!station.currentData) return;

        station.currentData.forEach(dep => {
            const dest = dep.dest.toLowerCase();
            const isInbound = INBOUND_DESTINATIONS.some(term => dest.includes(term));
            
            const nextId = isInbound ? station.nextIn : station.nextOut;
            const waypoint = isInbound ? station.waypointIn : station.waypointOut;
            const nextStation = stations.find(s => s.stopId === nextId);

            if (!nextStation) return;

            const travelTime = getTravelTime(station, nextStation, dep.line);
            const progress = (now - dep.time) / travelTime;

            // ZEICHNEN (Mit kleinem Puffer von 0.0 bis 1.0)
            if (progress >= 0 && progress <= 1.0) {
                const pos = getPosition(station, nextStation, waypoint, progress);
                const pxX = pos.x * canvas.width;
                const pxY = pos.y * canvas.height;

                const trainColor = LINE_COLORS[dep.line] || "#999";

                ctx.save();
                // Glow & Punkt
                ctx.shadowBlur = 15;
                ctx.shadowColor = trainColor;
                ctx.fillStyle = trainColor;
                ctx.beginPath();
                ctx.arc(pxX, pxY, 8, 0, Math.PI * 2);
                ctx.fill();
                
            }
        });
    });
}   

// 6. INITIALISIERUNG
function resize() {
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
}

window.onload = async () => {
    // Hier kannst du dein JSON laden
    // stations = await fetch('dein_json_pfad.json').then(r => r.json());
    
    resize();
    await updateEntireNetwork();
    
    setInterval(draw, 50); // 20 FPS für flüssige Bewegung
    setInterval(updateEntireNetwork, 60000); // Jede Minute neue API-Daten
};

window.onresize = resize;