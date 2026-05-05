/**
 * STUTTGART STADTBAHN RADAR
 * Fahrplan-basierte Positionsberechnung mit Echtzeit-Delay
 */

// ─── KONFIGURATION ────────────────────────────────────────────────────────────

const LOOKAHEAD_MS   =  900_000;
const TRAVEL_TIME_MS =  110_000;
const DELAY_TTL_MS   =   40_000;

const LINE_COLORS = {
    "U1": "#D3A170", "U2": "#EC6625", "U3": "#955C36",
    "U4": "#8164A9", "U5": "#00B1EB", "U6": "#E6007E",
    "U7": "#00A984", "U8": "#C6BD80", "U9": "#FFD500",
    "U11": "#9D9C9C", "U12": "#96C1E9", "U13": "#F3A4B9",
    "U14": "#6EB63E", "U15": "#004F9F", "U16": "#CBC100",
    "U19": "#FBB900"
};

const KNOWN_LINES = new Set(Object.keys(LINE_COLORS));

// ─── DOM ──────────────────────────────────────────────────────────────────────

const canvas = document.getElementById('mapCanvas');
const ctx    = canvas.getContext('2d');
const img    = document.getElementById('mapImage');

// ─── STATE (minimal, explizit mutable) ────────────────────────────────────────

let stations          = [];
let schedule          = [];
let overlayItems      = [];
let activePopup       = null;
let colorMode         = 'dark';

const activeSimulations = new Map();  // tripId → sim
const delayCache        = new Map();  // cacheKey → { trips, fetchedAt }
const chainCache        = new Map();  // "terminusId|line|dir" → { chain, cumMs }

// ─── PURE: STATION-LOOKUP ─────────────────────────────────────────────────────

// Index für O(1)-Lookup statt O(n)-find bei jedem Aufruf
let stationIndex = new Map(); // stopId → Station[]

function buildStationIndex() {
    stationIndex = new Map();
    for (const s of stations) {
        const list = stationIndex.get(s.stopId) ?? [];
        list.push(s);
        stationIndex.set(s.stopId, list);
    }
}

/** Pure: findet Station für stopId, bevorzugt passende Linie */
function findStation(stopId, line) {
    if (!stopId) return null;
    const candidates = stationIndex.get(stopId) ?? [];
    return candidates.find(s => s.lines?.includes(line)) ?? candidates[0] ?? null;
}

// ─── PURE: ZEIT-HILFSFUNKTIONEN ───────────────────────────────────────────────

/** Pure: travelTimeNext (s) → ms, Fallback auf TRAVEL_TIME_MS */
const getTravelTime = station =>
    (station.travelTimeNext != null && station.travelTimeNext > 0)
        ? station.travelTimeNext * 1000
        : TRAVEL_TIME_MS;

/** Pure: "HH:MM" → absolute ms für heute, korrigiert Mitternachts-Überlauf */
function parseDepTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const now    = Date.now();
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    let ms = midnight.getTime() + h * 3_600_000 + m * 60_000;
    if (ms - now >  12 * 3_600_000) ms -= 86_400_000;
    if (now - ms >  12 * 3_600_000) ms += 86_400_000;
    return ms;
}

/** Pure: heutiges Datum als itdDate-String */
const getItdDate = () => {
    const d = new Date();
    return d.getFullYear()
        + (d.getMonth() + 1).toString().padStart(2, '0')
        + d.getDate().toString().padStart(2, '0');
};

/** Pure: aktuelle Uhrzeit als itdTime-String */
const getItdTime = () => {
    const d = new Date();
    return d.getHours().toString().padStart(2, '0')
         + d.getMinutes().toString().padStart(2, '0');
};

// ─── PURE: STATIONSKETTE ──────────────────────────────────────────────────────

/**
 * Pure: Baut Kette ab Terminus. Gecacht in chainCache.
 * cutoffName: Kette endet an der Station die diesen Namen enthält.
 */
function buildStationChain(terminusStopId, line, direction, cutoffName = null) {
    const cacheKey = `${terminusStopId}|${line}|${direction}|${cutoffName ?? ''}`;
    if (!cutoffName && chainCache.has(cacheKey)) return chainCache.get(cacheKey).chain;

    const chain   = [];
    const visited = new Set();
    let   current = findStation(terminusStopId, line);
    if (!current) return chain;

    while (current && !visited.has(current.stopId)) {
        chain.push(current);
        visited.add(current.stopId);
        if (cutoffName && current.name.toLowerCase().includes(cutoffName.toLowerCase())) break;
        const nextId = direction === 'inbound' ? current.nextIn : current.nextOut;
        if (!nextId) break;
        current = findStation(nextId, line);
    }

    if (!cutoffName) chainCache.set(cacheKey, { chain });
    return chain;
}

/**
 * Pure: Kumulative Fahrzeiten für eine Stationskette.
 * Gecacht zusammen mit der Kette.
 */
function buildCumMs(chain) {
    const cumMs = [0];
    for (let i = 0; i < chain.length - 1; i++) {
        cumMs.push(cumMs[i] + getTravelTime(chain[i]));
    }
    return cumMs;
}

/** Pure: Liefert gecachtes Paar {chain, cumMs} für einen Schedule-Eintrag */
function getChainData(terminusStopId, line, direction) {
    const key = `${terminusStopId}|${line}|${direction}|`;
    if (chainCache.has(key)) return chainCache.get(key);
    const chain = buildStationChain(terminusStopId, line, direction);
    const cumMs = buildCumMs(chain);
    chainCache.set(key, { chain, cumMs });
    return { chain, cumMs };
}

// ─── PURE: POSITION & RENDERING ───────────────────────────────────────────────

/** Pure: interpolierte Position zwischen zwei Stationen (mit optionalem Waypoint) */
function getPosition(sA, sB, wp, t) {
    const hasWp = wp && (wp.pctX !== 0 || wp.pctY !== 0);
    if (!hasWp) return {
        x: sA.pctX + (sB.pctX - sA.pctX) * t,
        y: sA.pctY + (sB.pctY - sA.pctY) * t
    };
    if (t < 0.5) {
        const lt = t * 2;
        return { x: sA.pctX + (wp.pctX - sA.pctX) * lt, y: sA.pctY + (wp.pctY - sA.pctY) * lt };
    }
    const lt = (t - 0.5) * 2;
    return { x: wp.pctX + (sB.pctX - wp.pctX) * lt, y: wp.pctY + (sB.pctY - wp.pctY) * lt };
}

/** Pure: Delay-Lookup mit ±2-Minuten-Toleranz */
function getDelayForDep(trips, plannedDepMs) {
    const key = Math.round(plannedDepMs / 60_000);
    if (trips.has(key)) return trips.get(key);
    for (let d = 1; d <= 2; d++) {
        if (trips.has(key + d)) return trips.get(key + d);
        if (trips.has(key - d)) return trips.get(key - d);
    }
    return { delayMs: 0, actualDest: null };
}

/** Pure: Feiertags-korrigierter Fahrplan-Typ */
function getScheduleType() {
    const today = new Date();
    const dow   = today.getDay();
    if (dow === 0) return 'sunday';
    if (dow === 6) return 'saturday';

    const mm = today.getMonth() + 1, dd = today.getDate(), y = today.getFullYear();
    const fixed = [[1,1],[1,6],[5,1],[10,3],[11,1],[12,25],[12,26]];
    if (fixed.some(([m, d]) => m === mm && d === dd)) return 'sunday';

    const easter  = getEasterDate(y);
    const movable = [-2, 0, 1, 39, 49, 50, 60].map(n => addDays(easter, n));
    if (movable.some(d => d.getMonth() + 1 === mm && d.getDate() === dd)) return 'sunday';
    return 'weekday';
}

/** Pure: Ostersonntag nach Gauss */
function getEasterDate(y) {
    const a=y%19, b=Math.floor(y/100), c=y%100;
    const d=Math.floor(b/4), e=b%4, f=Math.floor((b+8)/25);
    const g=Math.floor((b-f+1)/3), h=(19*a+b-d-g+15)%30;
    const i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7;
    const m=Math.floor((a+11*h+22*l)/451);
    return new Date(y, Math.floor((h+l-7*m+114)/31)-1, ((h+l-7*m+114)%31)+1);
}

/** Pure: Datum + N Tage */
const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate()+days); return d; };

/** Pure: Name normalisieren für Vergleich */
const normalizeName = n => n.toLowerCase()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9]/g, '');

/** Pure: Station anhand Overlay-Name suchen */
function findStationByName(name) {
    const norm = normalizeName(name);
    return stations.find(s => normalizeName(s.name) === norm)
        ?? stations.find(s => normalizeName(s.name).includes(norm))
        ?? stations.find(s => norm.includes(normalizeName(s.name)))
        ?? null;
}

// ─── API ──────────────────────────────────────────────────────────────────────

/** Holt alle Abfahrten eines Terminus (gecacht). */
async function fetchTerminusData(terminusStopId, line) {
    const cacheKey = `${terminusStopId}|${line}`;
    const cached   = delayCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < DELAY_TTL_MS) return cached.trips;

    const trips = new Map();
    try {
        const url  = `https://www3.vvs.de/mngvvs/XML_DM_REQUEST?outputFormat=rapidJSON`
            + `&type_dm=any&name_dm=${terminusStopId}&mode=direct&useRealtime=1&limit=30`
            + `&itdDate=${getItdDate()}&itdTime=${getItdTime()}&t=${Date.now()}`;
        const data = await fetch(url).then(r => r.json());
        const evts = data.stopEvents || data.departures || [];

        for (const e of evts) {
            const raw    = e?.transportation?.disassembledName || '';
            const num    = e?.transportation?.number || '';
            const apiLine = raw.length > 1 ? raw : (num ? `U${num}` : raw);
            if (apiLine !== line) continue;

            const planned    = new Date(e.departureTimePlanned || e.arrivalTimePlanned).getTime();
            const estimated  = new Date(e.departureTimeEstimated || e.departureTimePlanned).getTime();
            const actualDest = e.transportation?.destination?.name || null;
            trips.set(Math.round(planned / 60_000), { delayMs: estimated - planned, actualDest });
        }
    } catch (err) {
        console.warn(`❌ ${terminusStopId} (${line}):`, err);
    }

    delayCache.set(cacheKey, { trips, fetchedAt: Date.now() });
    return trips;
}

/** Für Event-Linien ohne festen Fahrplan: Abfahrtszeiten direkt aus API. */
async function resolveEventLine({ terminusStopId, line }) {
    const trips = await fetchTerminusData(terminusStopId, line);
    if (!trips.size) return [];
    return [...trips.keys()].map(min => {
        const h = Math.floor((min % 1440) / 60), m = min % 60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    });
}

// ─── KERN: FAHRPLAN → SIMULATIONEN ───────────────────────────────────────────

async function updateEntireNetwork() {
    const now       = Date.now();
    const freshIds  = new Set();

    // Alle Termini parallel abfragen
    const uniqueTermini = [...new Set(
        schedule.filter(e => KNOWN_LINES.has(e.line)).map(e => `${e.terminusStopId}|${e.line}`)
    )];

    const terminusMap = new Map();
    let completed = 0;
    await Promise.all(uniqueTermini.map(async key => {
        const [stopId, line] = key.split('|');
        terminusMap.set(key, await fetchTerminusData(stopId, line));
        setLoadingProgress(++completed / uniqueTermini.length);
    }));

    for (const entry of schedule) {
        const { line, terminusStopId, direction } = entry;
        if (!KNOWN_LINES.has(line)) continue;

        const departures = entry.conditional
            ? await resolveEventLine(entry)
            : entry.departures;
        if (!departures?.length) continue;

        const { chain: fullChain, cumMs: fullCumMs } = getChainData(terminusStopId, line, direction);
        if (fullChain.length < 2) continue;

        const totalDurationMs = fullCumMs[fullCumMs.length - 1];
        const trips           = terminusMap.get(`${terminusStopId}|${line}`) ?? new Map();

        for (const depStr of departures) {
            const tripId    = `${line}_${direction}_${depStr}`;
            const plannedMs = parseDepTime(depStr);
            if (now > plannedMs + totalDurationMs + 60_000) continue;
            if (plannedMs > now + LOOKAHEAD_MS) continue;

            const { delayMs, actualDest } = getDelayForDep(trips, plannedMs);

            // Kurzläufer: Chain ggf. kürzen
            const terminus = fullChain[fullChain.length - 1];
            const isShort  = actualDest
                && !terminus.name.toLowerCase().includes(actualDest.toLowerCase())
                && !actualDest.toLowerCase().includes(terminus.name.toLowerCase());

            const chain = isShort
                ? buildStationChain(terminusStopId, line, direction, actualDest)
                : fullChain;
            if (chain.length < 2) continue;

            const cumMs          = isShort ? buildCumMs(chain) : fullCumMs;
            const effectiveDur   = cumMs[cumMs.length - 1];
            const actualDepMs    = plannedMs + delayMs;
            const elapsed        = now - actualDepMs;

            if (elapsed < 0) {
                freshIds.add(tripId);
                activeSimulations.set(tripId, {
                    line, direction, chain, cumMs, actualDepMs, segIdx: 0,
                    startStation: chain[0], endStation: chain[1],
                    startTime:    actualDepMs,
                    duration:     cumMs[1] - cumMs[0],
                    waypoint:     direction === 'inbound' ? chain[1].waypointIn : chain[1].waypointOut
                });
                continue;
            }
            if (elapsed >= effectiveDur) continue;

            let segIdx = 0;
            for (let i = 0; i < cumMs.length - 1; i++) {
                if (elapsed >= cumMs[i] && elapsed < cumMs[i + 1]) { segIdx = i; break; }
            }
            freshIds.add(tripId);
            activeSimulations.set(tripId, {
                line, direction, chain, cumMs, actualDepMs, segIdx,
                startStation: chain[segIdx], endStation: chain[segIdx + 1],
                startTime:    actualDepMs + cumMs[segIdx],
                duration:     cumMs[segIdx + 1] - cumMs[segIdx],
                waypoint:     direction === 'inbound'
                    ? chain[segIdx + 1].waypointIn
                    : chain[segIdx + 1].waypointOut
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
        const pos        = getPosition(train.startStation, train.endStation, train.waypoint, Math.min(1, progress));
        if (pos) drawMarker(pos.x * canvas.width, pos.y * canvas.height, train.line, alpha);
    }
}

function advanceSegment(id, sim) {
    const { chain, cumMs, actualDepMs, direction, segIdx: curIdx = 0 } = sim;
    const nextIdx = curIdx + 1;
    if (nextIdx >= chain.length - 1) return false;
    activeSimulations.set(id, {
        ...sim,
        segIdx:       nextIdx,
        startStation: chain[nextIdx],
        endStation:   chain[nextIdx + 1],
        startTime:    actualDepMs + cumMs[nextIdx],
        duration:     cumMs[nextIdx + 1] - cumMs[nextIdx],
        waypoint:     direction === 'inbound'
            ? chain[nextIdx + 1].waypointIn
            : chain[nextIdx + 1].waypointOut
    });
    return true;
}

function drawMarker(x, y, line, alpha) {
    const color = LINE_COLORS[line] || '#999';
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.shadowBlur  = 15;
    ctx.shadowColor = color;
    ctx.fillStyle   = color;
    ctx.beginPath();
    ctx.arc(x, y, canvas.width * 0.003, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// ─── DIAGNOSE ─────────────────────────────────────────────────────────────────

window.runDiagnostic = function() {
    console.group('🔍 RADAR DIAGNOSE');
    console.log(`Stationen: ${stations.length}, Fahrplan: ${schedule.length} Einträge`);
    schedule.forEach(entry => {
        const { chain, cumMs } = getChainData(entry.terminusStopId, entry.line, entry.direction);
        if (chain.length < 2) {
            console.error(`🔴 ${entry.line} ${entry.direction}: Kette bricht ab!`);
        } else {
            const mins = Math.round(cumMs[cumMs.length-1] / 60_000);
            console.log(`🟢 ${entry.line} ${entry.direction}: ${chain.length} St., ${mins} Min – ${chain[0].name} → ${chain[chain.length-1].name}`);
        }
    });
    const now = Date.now();
    let drawn = 0, waiting = 0;
    activeSimulations.forEach(s => ((now - s.startTime) / s.duration < 0 ? waiting++ : drawn++));
    console.log(`\nSimulationen: ${activeSimulations.size} total, ${drawn} aktiv, ${waiting} wartend`);
    console.groupEnd();
};

// ─── STATION OVERLAY ──────────────────────────────────────────────────────────

function setColorMode(mode) {
    colorMode = mode;
    document.querySelectorAll('.overlay-label img').forEach(el => {
        el.style.filter = mode === 'dark' ? 'invert(1)' : 'none';
    });
    document.body.dataset.theme = mode;
}

function initColorMode() {
    setColorMode(localStorage.getItem('colorMode') || 'dark');
}

window.toggleColorMode = function() {
    const next = colorMode === 'dark' ? 'light' : 'dark';
    localStorage.setItem('colorMode', next);
    setColorMode(next);
};

async function loadOverlay() {
    const file = (typeof OVERLAY_FILE !== 'undefined') ? OVERLAY_FILE : null;
    if (!file) return;
    try {
        const raw = await fetch(file).then(r => r.json());
        overlayItems = Array.isArray(raw) ? raw : (raw.stations ?? raw);
        console.log(`✅ Overlay: ${overlayItems.length} Stationen`);
        buildOverlayDOM();
    } catch(e) {
        console.warn('⚠️ Overlay konnte nicht geladen werden:', e);
    }
}

function buildOverlayDOM() {
    let container = document.getElementById('overlayContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'overlayContainer';
        document.body.appendChild(container);
    }
    container.innerHTML = '';
    const labelDir = (typeof LABEL_DIR !== 'undefined') ? LABEL_DIR : 'labels/';

    for (const item of overlayItems) {
        const el    = document.createElement('div');
        el.className    = 'overlay-label';
        el.dataset.pctX = item.pctX;
        el.dataset.pctY = item.pctY;
        el.dataset.pctW = item.pctW ?? 0;
        el.dataset.pctH = item.pctH ?? 0;
        el.title        = item.name;

        const imgEl        = document.createElement('img');
        imgEl.src          = labelDir + (item.file ?? (item.name + '.png'));
        imgEl.alt          = item.name;
        imgEl.draggable    = false;
        imgEl.style.filter = colorMode === 'dark' ? 'invert(1)' : 'none';
        el.appendChild(imgEl);

        el.addEventListener('mouseenter', () => el.classList.add('hovered'));
        el.addEventListener('mouseleave', () => el.classList.remove('hovered'));
        el.addEventListener('click', e => { e.stopPropagation(); openDeparturePopup(item, el); });

        container.appendChild(el);
    }

    positionOverlayLabels();
    watchImageResize();
    if (!img.complete) img.addEventListener('load', () => requestAnimationFrame(positionOverlayLabels));
}

function positionOverlayLabels() {
    const rect = img.getBoundingClientRect();
    if (rect.width === 0) return;
    for (const el of document.querySelectorAll('.overlay-label')) {
        el.style.left = `${rect.left + parseFloat(el.dataset.pctX) * rect.width}px`;
        el.style.top  = `${rect.top  + parseFloat(el.dataset.pctY) * rect.height}px`;
        const w = parseFloat(el.dataset.pctW), h = parseFloat(el.dataset.pctH);
        if (w > 0) el.style.width  = `${w * rect.width  * 0.7}px`;
        if (h > 0) el.style.height = `${h * rect.height * 0.7}px`;
    }
}

function watchImageResize() {
    if (typeof ResizeObserver === 'undefined') {
        window.addEventListener('resize', positionOverlayLabels);
        return;
    }
    new ResizeObserver(() => requestAnimationFrame(positionOverlayLabels)).observe(img);
    window.addEventListener('scroll', positionOverlayLabels, { passive: true });
}

// ─── ABFAHRTS-POPUP ───────────────────────────────────────────────────────────

function closePopup() {
    if (activePopup) { activePopup.remove(); activePopup = null; }
}

async function openDeparturePopup(item, anchorEl) {
    closePopup();

    let displayName, stopId;
    if (item.name.includes('|')) {
        [displayName, stopId] = item.name.split('|');
    } else {
        displayName = item.name;
        stopId      = findStationByName(item.name)?.stopId ?? null;
    }

    const lines = stopId
        ? [...new Set(stations.filter(s => s.stopId === stopId).flatMap(s => s.lines ?? []))]
        : [];
    const pills = lines.map(l =>
        `<span class="pill" style="background:${LINE_COLORS[l]||'#999'}">${l}</span>`
    ).join('');

    const popup = document.createElement('div');
    popup.id = 'stationPopup';
    popup.innerHTML = `
        <div class="popup-header">
            <span class="popup-name">${displayName}</span>
            <span class="popup-pills">${pills}</span>
            <button class="popup-close" id="popupClose">✕</button>
        </div>
        <div class="dep-header">
            <span></span><span>Richtung</span><span>Abfahrt</span>
            <span class="dep-h-delay">Verspätung</span>
        </div>
        <div class="popup-body" id="popupBody">
            <div class="popup-loading">Lade Abfahrten …</div>
        </div>`;

    document.body.appendChild(popup);
    activePopup = popup;
    document.getElementById('popupClose').onclick = closePopup;
    document.addEventListener('click', closePopup, { once: true });
    positionPopup(popup, anchorEl);

    if (!stopId) {
        document.getElementById('popupBody').innerHTML =
            `<div class="popup-empty">„${displayName}" nicht gefunden</div>`;
        return;
    }

    try {
        const url = `https://www3.vvs.de/mngvvs/XML_DM_REQUEST?outputFormat=rapidJSON`
            + `&type_dm=any&name_dm=${stopId}&mode=direct&useRealtime=1&limit=20`
            + `&itdDate=${getItdDate()}&itdTime=${getItdTime()}&t=${Date.now()}`;

        const data = await fetch(url).then(r => r.json());
        const list = (data.stopEvents || data.departures || [])
            .filter(e => e?.transportation?.disassembledName)
            .slice(0, 20);

        const body = document.getElementById('popupBody');
        if (!body) return;

        if (!list.length) {
            body.innerHTML = '<div class="popup-empty">Keine Abfahrten</div>';
        } else {
            body.innerHTML = list.map(e => {
                const line     = e.transportation.disassembledName;
                const dest     = e.transportation.destination?.name || '';
                const planned  = new Date(e.departureTimePlanned  || e.arrivalTimePlanned);
                const est      = new Date(e.departureTimeEstimated || e.departureTimePlanned);
                const delay    = Math.round((est - planned) / 60_000);
                const time     = `${planned.getHours().toString().padStart(2,'0')}:${planned.getMinutes().toString().padStart(2,'0')}`;
                const color    = LINE_COLORS[line] || '#999';
                const delayEl  = delay > 0
                    ? `<span class="dep-delay">+${delay} min</span>`
                    : delay < 0
                    ? `<span class="dep-early">${delay} min</span>`
                    : `<span class="dep-ontime">pünktlich</span>`;
                return `<div class="dep-row">
                    <span class="dep-pill" style="background:${color}">${line}</span>
                    <span class="dep-dest">${dest}</span>
                    <span class="dep-time">${time}</span>
                    <span class="dep-delay-col">${delayEl}</span>
                </div>`;
            }).join('');
        }

        const p = document.getElementById('stationPopup');
        if (p && activePopup) positionPopup(p, anchorEl);

    } catch {
        const body = document.getElementById('popupBody');
        if (body) body.innerHTML = '<div class="popup-empty">Fehler beim Laden</div>';
    }
}

function positionPopup(popup, anchorEl) {
    popup.style.visibility = 'hidden';
    popup.style.top = '0px';
    popup.style.left = '0px';
    requestAnimationFrame(() => {
        const { right, left: aLeft, top } = anchorEl.getBoundingClientRect();
        const pw = popup.offsetWidth || 340, ph = popup.offsetHeight || 200;
        const vw = window.innerWidth,  vh = window.innerHeight;
        const margin = 8;
        let x = right + margin;
        if (x + pw > vw - margin) x = aLeft - pw - margin;
        let y = top;
        if (y + ph > vh - margin) y = vh - ph - margin;
        popup.style.left       = `${Math.max(margin, x)}px`;
        popup.style.top        = `${Math.max(margin, y)}px`;
        popup.style.visibility = 'visible';
    });
}

// ─── LADEBALKEN ───────────────────────────────────────────────────────────────

function setLoadingProgress(fraction) {
    const bar   = document.getElementById('loadingBar');
    const fill  = document.getElementById('loadingFill');
    const label = document.getElementById('loadingLabel');
    if (!bar) return;
    fill.style.width    = `${Math.round(fraction * 100)}%`;
    label.textContent   = fraction < 1 ? `Echtzeitdaten werden geladen … ${Math.round(fraction*100)}%` : '';
    if (fraction >= 1) {
        setTimeout(() => { bar.style.opacity = '0'; setTimeout(() => bar.style.display = 'none', 400); }, 300);
    }
}

// ─── START ────────────────────────────────────────────────────────────────────

const resize = () => { canvas.width = img.clientWidth; canvas.height = img.clientHeight; };

async function init() {
    const stationFiles  = (typeof STATION_FILES  !== 'undefined') ? STATION_FILES  : [];
    const scheduleFiles = (typeof SCHEDULE_FILES !== 'undefined') ? SCHEDULE_FILES : null;
    const legacyFile    = (typeof SCHEDULE_FILE  !== 'undefined') ? SCHEDULE_FILE  : null;

    if (stationFiles.length) {
        const results = await Promise.all(
            stationFiles.map(p => fetch(p).then(r => r.json()).catch(() => []))
        );
        stations = results.flatMap(r => Array.isArray(r) ? r : (r.stations ?? []));
        buildStationIndex();
        console.log(`✅ ${stations.length} Stationen geladen`);
    }

    const type         = getScheduleType();
    const scheduleFile = scheduleFiles?.[type] ?? legacyFile;
    const typeLabel    = { weekday: 'Werktag', saturday: 'Samstag', sunday: 'Sonn-/Feiertag' };
    console.log(`📅 Fahrplan-Typ: ${typeLabel[type]}`);

    if (scheduleFile) {
        try {
            schedule = await fetch(scheduleFile).then(r => r.json());
            console.log(`✅ Fahrplan (${typeLabel[type]}): ${schedule.length} Einträge`);
        } catch(e) {
            console.error('❌ Fahrplan konnte nicht geladen werden:', e);
        }
    } else {
        console.warn('⚠️ Kein Fahrplan für heute konfiguriert.');
    }

    resize();
    initColorMode();
    await loadOverlay();
    await updateEntireNetwork();
    setInterval(draw, 40);
    setInterval(updateEntireNetwork, 40_000);
}

window.onload   = init;
window.onresize = resize;