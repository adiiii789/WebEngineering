/**
 * STUTTGART STADTBAHN RADAR
 * Fahrplan-basierte Positionsberechnung + API-Delay-Korrektur
 *
 * Fixes:
 *  - Kurzläufer: Chain wird am tatsächlichen API-Ziel abgeschnitten
 *  - "U"-Problem: transportation.number als Fallback für Linienname
 */

// ─── KONFIGURATION ────────────────────────────────────────────────────────────

let stations = [];
let schedule = [];

const LOOKAHEAD_MS   =  900_000;
const TRAVEL_TIME_MS =  110_000;
const DELAY_TTL_MS   =   40_000;

const LINE_COLORS = {
    "U1": "#D3A170", "U2": "#EC6625", "U3": "#955C36",
    "U4": "#8164A9", "U5": "#00B1EB", "U6": "#E6007E",
    "U7": "#00A984", "U8": "#C6BD80", "U9": "#FFD500",
    "U11": "#9D9C9C", "U12": "#96C1E9", "U13": "#F3A4B9",
    "U14": "#6EB63E", "U15": "#004F9F", "U16": "#CBC100",
    "U19": "#FBB900", "ZACKE":"#FBB900", "Seilbahn": "#FBB900"
};

const KNOWN_LINES = new Set(Object.keys(LINE_COLORS));

// ─── DOM ──────────────────────────────────────────────────────────────────────

const canvas = document.getElementById('mapCanvas');
const ctx    = canvas.getContext('2d');
const img    = document.getElementById('mapImage');

// ─── STATE ────────────────────────────────────────────────────────────────────

let activeSimulations = new Map();

// key: "terminusStopId_line_minute" → { delayMs, actualDest, fetchedAt }
const delayCache = new Map();

// ─── HILFSFUNKTIONEN ──────────────────────────────────────────────────────────

function findStation(stopId, line) {
    if (!stopId) return null;
    return stations.find(s => s.stopId === stopId && s.lines?.includes(line))
        ?? stations.find(s => s.stopId === stopId)
        ?? null;
}

function getTravelTime(station) {
    return (station.travelTimeNext != null && station.travelTimeNext > 0)
        ? station.travelTimeNext * 1000
        : TRAVEL_TIME_MS;
}

function parseDepTime(timeStr) {
    const [h, m]   = timeStr.split(':').map(Number);
    const now      = Date.now();
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    let depMs = midnight.getTime() + h * 3_600_000 + m * 60_000;
    if (depMs - now >  12 * 3_600_000) depMs -= 86_400_000;
    if (now - depMs >  12 * 3_600_000) depMs += 86_400_000;
    return depMs;
}

function getItdDate() {
    const d = new Date();
    return d.getFullYear().toString()
        + (d.getMonth() + 1).toString().padStart(2, '0')
        + d.getDate().toString().padStart(2, '0');
}

function getItdTime() {
    const d = new Date();
    return d.getHours().toString().padStart(2, '0')
        + d.getMinutes().toString().padStart(2, '0');
}

/**
 * Baut die Stationskette ab der Endhaltestelle auf.
 * cutoffName: Chain endet an der Station deren Name das tatsächliche
 * Fahrziel enthält (Kurzläufer / Depot-Fahrten).
 */
function buildStationChain(terminusStopId, line, direction, cutoffName = null) {
    const chain   = [];
    const visited = new Set();
    let current   = findStation(terminusStopId, line);

    if (!current) {
        console.warn(`⚠️ Terminus nicht gefunden: ${terminusStopId} (${line})`);
        return chain;
    }

    while (current && !visited.has(current.stopId)) {
        chain.push(current);
        visited.add(current.stopId);

        // FIX Kurzläufer: Chain am tatsächlichen API-Ziel abschneiden
        if (cutoffName && current.name.toLowerCase().includes(cutoffName.toLowerCase())) {
            break;
        }

        const nextId = direction === 'inbound' ? current.nextIn : current.nextOut;
        if (!nextId) break;
        current = findStation(nextId, line);
    }

    return chain;
}

function buildCumMs(chain) {
    const cumMs = [0];
    for (let i = 0; i < chain.length - 1; i++) {
        cumMs.push(cumMs[i] + getTravelTime(chain[i]));
    }
    return cumMs;
}

// ─── API: DELAY + TATSÄCHLICHES ZIEL ─────────────────────────────────────────

/**
 * Holt ALLE Abfahrten an einem Terminus in einem einzigen API-Call
 * und gibt eine Map zurück: plannedMinute → { delayMs, actualDest }
 *
 * Statt pro Abfahrt einen Call zu machen, wird der gesamte Response
 * gecacht und alle Züge dieser Linie daraus abgeglichen.
 */
async function fetchTerminusData(terminusStopId, line) {
    const cacheKey = `terminus_${terminusStopId}_${line}`;
    const cached   = delayCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < DELAY_TTL_MS) {
        return cached.trips;
    }

    const trips = new Map(); // plannedMinute → { delayMs, actualDest }

    try {
        const url = `https://www3.vvs.de/mngvvs/XML_DM_REQUEST?outputFormat=rapidJSON`
            + `&type_dm=any&name_dm=${terminusStopId}&mode=direct&useRealtime=1&limit=30`
            + `&itdDate=${getItdDate()}&itdTime=${getItdTime()}&t=${Date.now()}`;

        const res  = await fetch(url);
        const data = await res.json();
        const list = data.stopEvents || data.departures || [];

        for (const e of list) {
            const rawName = e?.transportation?.disassembledName || '';
            const number  = e?.transportation?.number || '';
            const apiLine = rawName.length > 1 ? rawName : (number ? `U${number}` : rawName);
            if (apiLine !== line) continue;

            const planned   = new Date(e.departureTimePlanned || e.arrivalTimePlanned).getTime();
            const estimated = new Date(e.departureTimeEstimated || e.departureTimePlanned).getTime();
            const delayMs   = estimated - planned;
            const actualDest = e.transportation?.destination?.name || null;

            // Key: geplante Minute (eindeutig genug für eine Linie)
            const key = Math.round(planned / 60_000);
            trips.set(key, { delayMs, actualDest });

            if (delayMs !== 0)
                console.log(`🕐 ${line}: ${Math.round(delayMs / 1000)}s Verspätung`);
        }
    } catch (err) {
        console.warn(`❌ Fetch fehlgeschlagen: ${terminusStopId} (${line})`, err);
    }

    delayCache.set(cacheKey, { trips, fetchedAt: Date.now() });
    return trips;
}

function getDelayForDep(trips, plannedDepMs) {
    const key = Math.round(plannedDepMs / 60_000);
    // Exakter Treffer
    if (trips.has(key)) return trips.get(key);
    // ±2 Minuten Toleranz für leicht verspätete Züge
    for (let d = 1; d <= 2; d++) {
        if (trips.has(key + d)) return trips.get(key + d);
        if (trips.has(key - d)) return trips.get(key - d);
    }
    return { delayMs: 0, actualDest: null };
}

// ─── KERN: FAHRPLAN → SIMULATIONEN ───────────────────────────────────────────

/**
 * Für Event-Linien (U11 etc.) ohne festen Fahrplan:
 * API-Abfrage an der Endhaltestelle – wenn Abfahrten vorhanden,
 * werden die Abfahrtszeiten direkt als Fahrplan verwendet.
 * Kein schedule.json-Eintrag nötig, nur stations.json.
 */
async function resolveEventLine(entry, now) {
    const { line, terminusStopId, direction } = entry;
    const trips = await fetchTerminusData(terminusStopId, line);
    if (trips.size === 0) return []; // Linie fährt heute nicht

    console.log(`🎪 ${line} aktiv (Event-Linie, ${trips.size} Abfahrten gefunden)`);

    // trips-Keys sind plannedMinutes → zurück in HH:MM wandeln für Kompatibilität
    const departures = [];
    for (const [minuteKey] of trips) {
        const h = Math.floor((minuteKey % (24 * 60)) / 60);
        const m = minuteKey % 60;
        departures.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    }
    return departures;
}

async function updateEntireNetwork() {
    console.log("📡 Aktualisiere Fahrplan-Simulationen...");
    const now      = Date.now();
    const freshIds = new Set();

    // FIX GESCHWINDIGKEIT: Alle Terminus-Calls parallel statt sequentiell
    // Vorher: N Linien × M Abfahrten × ~200ms = viele Sekunden
    // Jetzt:  N Linien parallel, ein Call pro Linie = ~200-400ms gesamt
    const uniqueTermini = [...new Set(
        schedule.filter(e => KNOWN_LINES.has(e.line))
                .map(e => `${e.terminusStopId}|${e.line}`)
    )];

    const terminusDataMap = new Map();
    let completed = 0;
    await Promise.all(
        uniqueTermini.map(async key => {
            const [stopId, line] = key.split('|');
            const trips = await fetchTerminusData(stopId, line);
            terminusDataMap.set(key, trips);
            completed++;
            setLoadingProgress(completed / uniqueTermini.length);
        })
    );

    for (const entry of schedule) {
        const { line, terminusStopId, direction } = entry;
        if (!KNOWN_LINES.has(line)) continue;

        // Event-Linien (U11 etc.): Abfahrten dynamisch aus API holen
        const departures = entry.conditional
            ? await resolveEventLine(entry, now)
            : entry.departures;

        if (!departures || departures.length === 0) continue;

        const fullChain = buildStationChain(terminusStopId, line, direction);
        if (fullChain.length < 2) {
            console.warn(`⚠️ Kette zu kurz: ${line} ${direction} ab ${terminusStopId}`);
            continue;
        }
        const fullCumMs       = buildCumMs(fullChain);
        const totalDurationMs = fullCumMs[fullCumMs.length - 1];
        const trips           = terminusDataMap.get(`${terminusStopId}|${line}`) ?? new Map();

        for (const depStr of departures) {
            const tripId    = `${line}_${direction}_${depStr}`;
            const plannedMs = parseDepTime(depStr);

            if (now > plannedMs + totalDurationMs + 60_000) continue;
            if (plannedMs > now + LOOKAHEAD_MS) continue;

            // Delay aus gecachtem Batch-Result holen – kein extra API-Call
            const { delayMs, actualDest } = getDelayForDep(trips, plannedMs);

            const terminusStation = fullChain[fullChain.length - 1];
            const isShortRunner   = actualDest
                && !terminusStation.name.toLowerCase().includes(actualDest.toLowerCase())
                && !actualDest.toLowerCase().includes(terminusStation.name.toLowerCase());

            const chain = isShortRunner
                ? buildStationChain(terminusStopId, line, direction, actualDest)
                : fullChain;

            if (isShortRunner)
                console.log(`🔀 ${line} Kurzläufer bis "${actualDest}"`);

            if (chain.length < 2) continue;

            const cumMs             = buildCumMs(chain);
            const effectiveDuration = cumMs[cumMs.length - 1];
            const actualDepMs       = plannedMs + delayMs;
            const elapsed           = now - actualDepMs;

            if (elapsed < 0) {
                freshIds.add(tripId);
                activeSimulations.set(tripId, {
                    line, direction, chain, cumMs, actualDepMs,
                    startStation: chain[0],
                    endStation:   chain[1],
                    startTime:    actualDepMs,
                    duration:     cumMs[1] - cumMs[0],
                    waypoint:     direction === 'inbound' ? chain[0].waypointIn : chain[0].waypointOut
                });
                continue;
            }

            if (elapsed >= effectiveDuration) continue;

            let segIdx = 0;
            for (let i = 0; i < cumMs.length - 1; i++) {
                if (elapsed >= cumMs[i] && elapsed < cumMs[i + 1]) { segIdx = i; break; }
            }

            freshIds.add(tripId);
            activeSimulations.set(tripId, {
                line, direction, chain, cumMs, actualDepMs,
                startStation: chain[segIdx],
                endStation:   chain[segIdx + 1],
                startTime:    actualDepMs + cumMs[segIdx],
                duration:     cumMs[segIdx + 1] - cumMs[segIdx],
                waypoint:     direction === 'inbound'
                    ? chain[segIdx].waypointIn
                    : chain[segIdx].waypointOut
            });
        }
    }

    for (const id of activeSimulations.keys()) {
        if (!freshIds.has(id)) activeSimulations.delete(id);
    }

    console.log(`✅ ${activeSimulations.size} Züge aktiv`);
}

// ─── RENDERING ────────────────────────────────────────────────────────────────

function draw() {
    if (!canvas.width || !img.complete) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = Date.now();

    for (const [id, train] of activeSimulations) {
        const progress = (now - train.startTime) / train.duration;

        if (progress < 0) continue;

        if (progress >= 1.0) {
            if (!advanceSegment(id, train)) activeSimulations.delete(id);
            continue;
        }

        const isFirstSeg = train.startStation.stopId === train.chain[0].stopId;
        const alpha      = isFirstSeg ? Math.min(1, progress / 0.1) : 1.0;
        const t          = Math.min(1, Math.max(0, progress));
        const pos        = getPosition(train.startStation, train.endStation, train.waypoint, t);
        if (pos) drawMarker(pos.x * canvas.width, pos.y * canvas.height, train.line, alpha);
    }
}

function advanceSegment(id, sim) {
    const { chain, cumMs, actualDepMs, direction } = sim;

    const elapsed = sim.startTime - actualDepMs;
    let curIdx = 0;
    for (let i = 0; i < cumMs.length - 1; i++) {
        if (Math.abs(cumMs[i] - elapsed) < 1000) { curIdx = i; break; }
    }

    const nextIdx = curIdx + 1;
    if (nextIdx >= chain.length - 1) return false;

    activeSimulations.set(id, {
        ...sim,
        startStation: chain[nextIdx],
        endStation:   chain[nextIdx + 1],
        startTime:    actualDepMs + cumMs[nextIdx],
        duration:     cumMs[nextIdx + 1] - cumMs[nextIdx],
        waypoint:     direction === 'inbound'
            ? chain[nextIdx].waypointIn
            : chain[nextIdx].waypointOut
    });
    return true;
}

function getPosition(sA, sB, wp, t) {
    const hasWp = wp && (wp.pctX !== 0 || wp.pctY !== 0);
    if (!hasWp) {
        return { x: sA.pctX + (sB.pctX - sA.pctX) * t, y: sA.pctY + (sB.pctY - sA.pctY) * t };
    }
    if (t < 0.5) {
        const lt = t * 2;
        return { x: sA.pctX + (wp.pctX - sA.pctX) * lt, y: sA.pctY + (wp.pctY - sA.pctY) * lt };
    }
    const lt = (t - 0.5) * 2;
    return { x: wp.pctX + (sB.pctX - wp.pctX) * lt, y: wp.pctY + (sB.pctY - wp.pctY) * lt };
}

function drawMarker(x, y, line, alpha) {
    const color = LINE_COLORS[line] || "#999";
    ctx.save();
    ctx.globalAlpha  = Math.max(0, Math.min(1, alpha));
    ctx.shadowBlur   = 15;
    ctx.shadowColor  = color;
    ctx.fillStyle    = color;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    // ctx.shadowBlur   = 0;
    // ctx.strokeStyle  = "white";
    // ctx.lineWidth    = 2;
    // ctx.stroke();
    // ctx.fillStyle    = "white";
    // ctx.font         = "bold 10px Arial";
    // ctx.fillText(line, x + 10, y + 4);
    ctx.restore();
}

// ─── DIAGNOSE ─────────────────────────────────────────────────────────────────

window.runDiagnostic = function() {
    console.group("🔍 RADAR DIAGNOSE");
    console.log(`Stationen: ${stations.length}, Fahrplan-Einträge: ${schedule.length}`);

    schedule.forEach(entry => {
        const chain = buildStationChain(entry.terminusStopId, entry.line, entry.direction);
        const cumMs = buildCumMs(chain);
        const total = Math.round(cumMs[cumMs.length - 1] / 60_000);
        if (chain.length < 2) {
            console.error(`🔴 ${entry.line} ${entry.direction}: Kette bricht ab!`);
        } else {
            console.log(`🟢 ${entry.line} ${entry.direction}: ${chain.length} St., ${total} Min`);
            console.log(`   ${chain[0].name} → ${chain[chain.length - 1].name}`);
        }
    });

    const now = Date.now();
    let drawn = 0, waiting = 0;
    activeSimulations.forEach(sim => {
        ((now - sim.startTime) / sim.duration < 0) ? waiting++ : drawn++;
    });
    console.log(`\nSimulationen: ${activeSimulations.size} total, ${drawn} aktiv, ${waiting} wartend`);

    console.group("🔀 Kurzläufer im Cache:");
    delayCache.forEach((v, k) => { if (v.actualDest) console.log(`  ${k} → "${v.actualDest}"`); });
    console.groupEnd();
    console.groupEnd();
};

// ─── LADEBALKEN ───────────────────────────────────────────────────────────────

function setLoadingProgress(fraction) {
    const bar     = document.getElementById('loadingBar');
    const fill    = document.getElementById('loadingFill');
    const label   = document.getElementById('loadingLabel');
    if (!bar) return;

    const pct = Math.round(fraction * 1000); // dont ask me why
    fill.style.width = `${pct}%`;
    label.textContent = fraction < 1 ? `Fetching API … ${pct}%` : '';

    if (fraction >= 1) {
        // Kurz warten, dann weich ausblenden
        setTimeout(() => {
            bar.style.opacity = '0';
            setTimeout(() => bar.style.display = 'none', 400);
        }, 300);
    }
}

// ─── RESIZE & START ───────────────────────────────────────────────────────────

function resize() {
    canvas.width  = img.clientWidth;
    canvas.height = img.clientHeight;
}

/**
 * Gibt den Fahrplan-Typ für heute zurück: "saturday" | "sunday" | "weekday"
 * Feiertage in Baden-Württemberg werden wie Sonntag behandelt.
 */
function getScheduleType() {
    const today = new Date();
    const dow   = today.getDay(); // 0=So, 6=Sa

    if (dow === 0) return "sunday";
    if (dow === 6) return "saturday";

    // Feiertage BW (bundesweite + landesspezifische)
    const mm  = today.getMonth() + 1;
    const dd  = today.getDate();
    const y   = today.getFullYear();

    // Feste Feiertage
    const fixed = [
        [1,  1],  // Neujahr
        [1,  6],  // Heilige Drei Könige (BW)
        [5,  1],  // Tag der Arbeit
        [10, 3],  // Tag der Deutschen Einheit
        [11, 1],  // Allerheiligen (BW)
        [12, 25], // 1. Weihnachtstag
        [12, 26], // 2. Weihnachtstag
    ];
    if (fixed.some(([m, d]) => m === mm && d === dd)) return "sunday";

    // Bewegliche Feiertage (Oster-Algorithmus nach Gauss)
    const easter = getEasterDate(y);
    const movable = [
        addDays(easter, -2),  // Karfreitag
        addDays(easter,  0),  // Ostersonntag
        addDays(easter,  1),  // Ostermontag
        addDays(easter, 39),  // Christi Himmelfahrt
        addDays(easter, 49),  // Pfingstsonntag
        addDays(easter, 50),  // Pfingstmontag
        addDays(easter, 60),  // Fronleichnam (BW)
    ];
    if (movable.some(d => d.getMonth() + 1 === mm && d.getDate() === dd)) return "sunday";

    return "weekday";
}

function getEasterDate(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19*a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2*e + 2*i - h - k) % 7;
    const m = Math.floor((a + 11*h + 22*l) / 451);
    const month = Math.floor((h + l - 7*m + 114) / 31);
    const day   = ((h + l - 7*m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

async function init() {
    const stationFiles = (typeof STATION_FILES !== 'undefined') ? STATION_FILES : [];
    const scheduleFiles = (typeof SCHEDULE_FILES !== 'undefined') ? SCHEDULE_FILES : null;
    // Rückwärtskompatibel: altes SCHEDULE_FILE (einzelne Datei) weiterhin unterstützen
    const legacyFile   = (typeof SCHEDULE_FILE  !== 'undefined') ? SCHEDULE_FILE  : null;

    if (stationFiles.length) {
        const results = await Promise.all(
            stationFiles.map(p => fetch(p).then(r => r.json()).catch(() => []))
        );
        stations = results.flatMap(r => Array.isArray(r) ? r : (r.stations ?? []));
        console.log(`✅ ${stations.length} Stationen geladen`);
    }

    // Fahrplan-Typ bestimmen und passende Datei laden
    const type         = getScheduleType();
    const scheduleFile = scheduleFiles?.[type] ?? legacyFile;

    const typeLabel = { weekday: "Werktag", saturday: "Samstag", sunday: "Sonn-/Feiertag" };
    console.log(`📅 Fahrplan-Typ: ${typeLabel[type]}`);

    if (scheduleFile) {
        try {
            schedule = await fetch(scheduleFile).then(r => r.json());
            console.log(`✅ Fahrplan geladen (${typeLabel[type]}): ${schedule.length} Einträge`);
        } catch(e) {
            console.error("❌ Fahrplan konnte nicht geladen werden:", e);
        }
    } else {
        console.warn("⚠️ Kein Fahrplan für heute konfiguriert.");
    }

    resize();
    await updateEntireNetwork();
    setInterval(draw, 40);
    setInterval(updateEntireNetwork, 40_000);
}


window.onload   = init;
window.onresize = resize;