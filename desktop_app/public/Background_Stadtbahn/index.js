// variables
const LOOKAHEAD_MS   =  900_000;
const TRAVEL_TIME_MS =  110_000;
const DELAY_TTL_MS   =   40_000;

// Key stops used for waiting until departure time
const KEY_STOPS = new Set([
    'de:08111:6112',  // Hauptbahnhof
    'de:08111:6075',  // Charlottenplatz
    'de:08111:6022',  // Schlossplatz
    'de:08111:6002',  // Vaihingen Bf
    'de:08111:6169',  // Möhringen Bahnhof
    'de:08111:6113',  // Pragsattel
    'de:08111:6157',  // Feuerbach
    'de:08111:6165',  // Degerloch
    'de:08111:6056',  // Rotebühlplatz
]);

// all colors of the Metros
const LINE_COLORS = {
    "U1": "#D3A170", "U2": "#EC6625", "U3": "#955C36",
    "U4": "#8164A9", "U5": "#00B1EB", "U6": "#E6007E",
    "U7": "#00A984", "U8": "#C6BD80", "U9": "#FFD500",
    "U11": "#9D9C9C", "U12": "#96C1E9", "U13": "#F3A4B9",
    "U14": "#6EB63E", "U15": "#004F9F", "U16": "#CBC100",
    "U19": "#FBB900"
};

// for matching
const KNOWN_LINES = new Set(Object.keys(LINE_COLORS));

// filter
const FERNVERKEHR = ['ICE', 'IC ', 'IC-', 'EC ', 'EC-', 'RJ', 'TGV', 'EN', 'NJ', 'D ', 'MEX'];
const isFernverkehr = name => FERNVERKEHR.some(p => name.toUpperCase().startsWith(p.trim()));

// ─── DOM ──────────────────────────────────────────────────────────────────────

const canvas = document.getElementById('mapCanvas');
const ctx    = canvas.getContext('2d');
const img    = document.getElementById('mapImage');

// States
let stations          = [];
let schedule          = [];
let overlayItems      = [];
let activePopup       = null;
let colorMode         = 'dark';

const activeSimulations = new Map();  // tripId -> sim
const delayCache        = new Map();  // cacheKey -> { trips, fetchedAt }
const chainCache        = new Map();  // "terminusId|line|dir" -> { chain, cumMs }
const tripDelayCache    = new Map();  // tripId -> delayMs (letzter bekannter Wert)

// Station Lookup logic
let stationIndex = new Map();

function buildStationIndex() {
    stationIndex = new Map();
    for (const s of stations) {
        const list = stationIndex.get(s.stopId) ?? []; // get stationindex from stopId
        list.push(s);
        stationIndex.set(s.stopId, list);
    }
}

// finds Station for stopId, prefers fitting line
function findStation(stopId, line) {
    if (!stopId) return null;
    const candidates = stationIndex.get(stopId) ?? [];
    return candidates.find(s => s.lines?.includes(line)) ?? candidates[0] ?? null; // first candidates in line, then candiates, else nothing
}

// get traveltime from schedule, else TRAVEL_TIME_MS as fallback
const getTravelTime = station =>
    (station.travelTimeNext != null && station.travelTimeNext > 0)
        ? station.travelTimeNext * 1000
        : TRAVEL_TIME_MS;

// Parse departure time - converts in ms, corrects midnight overflow
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

// current date as itdDate - used by the EFA ("Elektronische Fahrplan-Auskunft")
const getItdDate = () => {
    const d = new Date();
    return d.getFullYear()
        + (d.getMonth() + 1).toString().padStart(2, '0')
        + d.getDate().toString().padStart(2, '0');
};

// current time as itdTime - used by the EFA
const getItdTime = () => {
    const d = new Date();
    return d.getHours().toString().padStart(2, '0')
         + d.getMinutes().toString().padStart(2, '0');
};

//builds chain from terminus defined in schedule, chain ends at cutoffName
function buildStationChain(terminusStopId, line, direction, cutoffName = null) {
    const cacheKey = `${terminusStopId}|${line}|${direction}|${cutoffName ?? ''}`;
    if (!cutoffName && chainCache.has(cacheKey)) return chainCache.get(cacheKey).chain; // if chain already cached - return early

    const chain   = [];
    const visited = new Set();
    let   current = findStation(terminusStopId, line);
    if (!current) return chain;

    while (current && !visited.has(current.stopId)) { // logic for building chain
        chain.push(current);
        visited.add(current.stopId);
        if (cutoffName && current.name.toLowerCase().includes(cutoffName.toLowerCase())) break;
        const nextId = direction === 'inbound' ? current.nextIn : current.nextOut;
        if (!nextId) break;
        current = findStation(nextId, line);
    }

    if (!cutoffName) chainCache.set(cacheKey, { chain }); // sets cache for chain
    return chain;
}

// cumulative departure time for chain
function buildCumMs(chain) {
    const cumMs = [0];
    for (let i = 0; i < chain.length - 1; i++) {
        cumMs.push(cumMs[i] + getTravelTime(chain[i]));
    }
    return cumMs;
}

// get cached chain for schedule, else run build chain
function getChainData(terminusStopId, line, direction) {
    const key = `${terminusStopId}|${line}|${direction}|`;
    if (chainCache.has(key)) return chainCache.get(key);
    const chain = buildStationChain(terminusStopId, line, direction);
    const cumMs = buildCumMs(chain);
    chainCache.set(key, { chain, cumMs });
    return { chain, cumMs };
}

// interpolated position between two stations (with waypoint)
function getPosition(sA, sB, wp, t) { // station A, station B, Waypoint, time
    const hasWp = wp && (wp.pctX !== 0 || wp.pctY !== 0);
    if (!hasWp) return {
        x: sA.pctX + (sB.pctX - sA.pctX) * t, // if no waypoint, calculate immediatly position at current time
        y: sA.pctY + (sB.pctY - sA.pctY) * t
    };
    if (t < 0.5) { // half the time: station A to waypoint
        const lt = t * 2;
        return { x: sA.pctX + (wp.pctX - sA.pctX) * lt, y: sA.pctY + (wp.pctY - sA.pctY) * lt };
    }
    const lt = (t - 0.5) * 2; // other half: waypoint to station b
    return { x: wp.pctX + (sB.pctX - wp.pctX) * lt, y: wp.pctY + (sB.pctY - wp.pctY) * lt };
}

// Delay lookup with +- 2 minutes tolerance
function getDelayForDep(trips, plannedDepMs) {
    const key = Math.round(plannedDepMs / 60_000);
    if (trips.has(key)) return trips.get(key);
    for (let d = 1; d <= 2; d++) {
        if (trips.has(key + d)) return trips.get(key + d);
        if (trips.has(key - d)) return trips.get(key - d);
    }
    return { delayMs: 0, actualDest: null }; //no delay fallback
}

// Schedule Type differenciates between Workday, Saturday, and Sunday (with holiday)
function getScheduleType() {
    const today = new Date();
    const dow   = today.getDay(); // returns day of week as string
    if (dow === 0) return 'sunday';
    if (dow === 6) return 'saturday';

    const mm = today.getMonth() + 1, dd = today.getDate(), y = today.getFullYear(); // MM.DD:YYYY
    const fixed = [[1,1],[1,6],[5,1],[10,3],[11,1],[12,25],[12,26]]; // Fixed holidays
    if (fixed.some(([m, d]) => m === mm && d === dd)) return 'sunday'; //logic to return sunday on holiday

    const easter  = getEasterDate(y); //will be explained below
    const movable = [-2, 0, 1, 39, 49, 50, 60].map(n => addDays(easter, n)); //holidays relative to eastern
    if (movable.some(d => d.getMonth() + 1 === mm && d.getDate() === dd)) return 'sunday'; // movable holidays
    return 'weekday';
}

// this is pretty interesting: Gauss made an algorithm to determine eastern in any given Year, just a raw implementation (some holidays are relative to eastern)
function getEasterDate(y) {
    const a=y%19, b=Math.floor(y/100), c=y%100;
    const d=Math.floor(b/4), e=b%4, f=Math.floor((b+8)/25);
    const g=Math.floor((b-f+1)/3), h=(19*a+b-d-g+15)%30;
    const i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7;
    const m=Math.floor((a+11*h+22*l)/451);
    return new Date(y, Math.floor((h+l-7*m+114)/31)-1, ((h+l-7*m+114)%31)+1); //returns the date of eastern in this year
}

//makes dates out of the offset list (i.e. -2 means eastern date - 2, ...)
const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate()+days); return d; };

// to accept any input, normalize special characters
const normalizeName = n => n.toLowerCase()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9]/g, '');

// by normalizing - best chance to get a return from API (however API is suprisingly flexible with inputs)
function findStationByName(name) {
    const norm = normalizeName(name);
    return stations.find(s => normalizeName(s.name) === norm)
        ?? stations.find(s => normalizeName(s.name).includes(norm))
        ?? stations.find(s => norm.includes(normalizeName(s.name)))
        ?? null;
}

// gets departures of any stops, is used by terminus and key_station departure times
async function fetchStopData(stopId, line) {
    const cacheKey = `${stopId}|${line}`;
    const cached   = delayCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < DELAY_TTL_MS) return cached.trips;

    const trips = new Map();
    try {
        const url  = `https://www3.vvs.de/mngvvs/XML_DM_REQUEST`
            `?outputFormat=rapidJSON` +
            `&type_dm=any` +
            `&name_dm=${stopId}` +
            `&mode=direct` +
            `&useRealtime=1` +
            `&limit=30` +
            `&itdDate=${getItdDate()}` +
            `&itdTime=${getItdTime()}` +
            `&t=${Date.now()}`;
        const data = await fetch(url).then(r => r.json());
        const evts = data.stopEvents || data.departures || [];

        for (const e of evts) { // for every event, get all departure data
            const raw     = e?.transportation?.disassembledName || '';
            const num     = e?.transportation?.number || '';
            const apiLine = raw.length > 1 ? raw : (num ? `U${num}` : raw);
            if (apiLine !== line) continue;
            const planned    = new Date(e.departureTimePlanned || e.arrivalTimePlanned).getTime();
            const estimated  = new Date(e.departureTimeEstimated || e.departureTimePlanned).getTime();
            const actualDest = e.transportation?.destination?.name || null;
            trips.set(Math.round(planned / 60_000), { delayMs: estimated - planned, actualDest, estimatedMs: estimated });
        }
    } catch (err) {
        console.warn(`❌ ${stopId} (${line}):`, err);
    }

    delayCache.set(cacheKey, { trips, fetchedAt: Date.now() });
    return trips;
}

// actual departure time on a key station
async function fetchKeyStopDeparture(stopId, line, approxMs) {
    const trips = await fetchStopData(stopId, line);
    const key   = Math.round(approxMs / 60_000);
    // tolerance of +- 3 minutes
    for (let d = 0; d <= 3; d++) {
        for (const k of [key + d, key - d]) {
            const entry = trips.get(k);
            if (entry) return entry.estimatedMs ?? (k * 60_000);
        }
    }
    return null;
}

// Metro lines like the U11 have no own schedule, so for those the departure time comes from the API
async function resolveEventLine({ terminusStopId, line }) {
    const trips = await fetchStopData(terminusStopId, line);
    if (!trips.size) return [];
    return [...trips.keys()].map(min => {
        const h = Math.floor((min % 1440) / 60), m = min % 60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    });
}

// core of the programm: simulate Metro based on schedule
async function updateEntireNetwork() {
    const now       = Date.now();
    const freshIds  = new Set();

    // fetch terminus in parallel
    const uniqueTermini = [...new Set(
        schedule.filter(e => KNOWN_LINES.has(e.line)).map(e => `${e.terminusStopId}|${e.line}`)
    )];

    const terminusMap = new Map();
    let completed = 0;
    await Promise.all(uniqueTermini.map(async key => {
        const [stopId, line] = key.split('|');
        terminusMap.set(key, await fetchStopData(stopId, line));
        setLoadingProgress(++completed / uniqueTermini.length); //visual for loading bar
    }));

    for (const entry of schedule) { // for each entry of schedule
        const { line, terminusStopId, direction } = entry;
        if (!KNOWN_LINES.has(line)) continue; // return early but only next loop

        const departures = entry.conditional
            ? await resolveEventLine(entry) // if conditional flag is set
            : entry.departures;
        if (!departures?.length) continue;

        const { chain: fullChain, cumMs: fullCumMs } = getChainData(terminusStopId, line, direction);
        if (fullChain.length < 2) continue; // single element or even less

        const totalDurationMs = fullCumMs[fullCumMs.length - 1];
        const trips           = terminusMap.get(`${terminusStopId}|${line}`) ?? new Map();

        for (const depStr of departures) { // for each departure in departures
            const tripId    = `${line}_${direction}_${depStr}`;
            const plannedMs = parseDepTime(depStr);
            if (now > plannedMs + totalDurationMs + 60_000) continue; //if now is bigger, departure is already completed
            if (plannedMs > now + LOOKAHEAD_MS) continue;             //if now is lower, departure is coming soon

            const { delayMs: freshDelay, actualDest } = getDelayForDep(trips, plannedMs);

            const tripKey      = tripId;
            const foundInApi   = trips.has(Math.round(plannedMs / 60_000))
                              || [...Array(5)].some((_,i) =>
                                  trips.has(Math.round(plannedMs/60_000)+i-2));
            if (foundInApi) tripDelayCache.set(tripKey, freshDelay); // delay from api set in cache
            const delayMs = tripDelayCache.get(tripKey) ?? freshDelay; // getr from cache

            // cut chain if short 
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

            // Calculate real departure time from API for key_stations
            // keyDepartures - absolute ms when Metro departs from station
            const keyDepartures = {};
            for (let i = 0; i < chain.length - 1; i++) {
                if (KEY_STOPS.has(chain[i].stopId)) {
                    const approxMs = actualDepMs + cumMs[i];
                    // Asynchron im Hintergrund – beim nächsten Update verfügbar
                    fetchKeyStopDeparture(chain[i].stopId, line, approxMs)
                        .then(depMs => { if (depMs) keyDepartures[i] = depMs; });
                }
            }

            if (elapsed < 0) { //train will soon start
                freshIds.add(tripId);
                activeSimulations.set(tripId, {
                    line, direction, chain, cumMs, actualDepMs, segIdx: 0,
                    keyDepartures,
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
                if (elapsed >= cumMs[i] && elapsed < cumMs[i + 1]) { segIdx = i; break; } // if train is on the board, it gets an unique id
            }
            freshIds.add(tripId);
            activeSimulations.set(tripId, {
                line, direction, chain, cumMs, actualDepMs, segIdx,
                keyDepartures,
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
        if (!freshIds.has(id)) activeSimulations.delete(id); // if not in activeSimulations, delete
    }
    console.log(`${activeSimulations.size} Züge aktiv`);
}


// draws (Renders) the circles on canvas
function draw() {   
    if (!canvas.width || !img.complete) return; //will not draw if nothings here or img isn't loaded
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = Date.now();

    for (const [id, train] of activeSimulations) {
        // will wait at key_location based on API call
        const keyDep = train.keyDepartures?.[train.segIdx];
        if (keyDep && now < keyDep) {
            const pos = getPosition(train.startStation, train.endStation, train.waypoint, 0);
            if (pos) drawMarker(pos.x * canvas.width, pos.y * canvas.height, train.line, 1.0);
            continue;
        }

        // drivephase
        const moveStart = keyDep ?? train.startTime; // startTime as fallback
        const progress  = (now - moveStart) / train.duration;
        if (progress < 0) continue; // train is initialized, but to early to drive

        if (progress >= 1.0) {
            if (!advanceSegment(id, train)) activeSimulations.delete(id); // if train completed drive, delete it
            continue;
        }

        const isFirstSeg = train.startStation.stopId === train.chain[0].stopId; // if same stationid as first element of chain
        const alpha      = isFirstSeg ? Math.min(1, progress / 0.1) : 1.0; // fade in for station
        const pos        = getPosition(train.startStation, train.endStation, train.waypoint, Math.min(1, progress)); // current position between stations
        if (pos) drawMarker(pos.x * canvas.width, pos.y * canvas.height, train.line, alpha);
    }
}

function advanceSegment(id, sim) { // boolean - true if it can drive to the next part in the chain
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

function drawMarker(x, y, line, alpha) { // draw on canvas
    const color = LINE_COLORS[line] || '#999';
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.shadowBlur  = 15;
    ctx.shadowColor = color;
    ctx.fillStyle   = color;
    ctx.beginPath();
    ctx.arc(x, y, canvas.width * 0.003, 0, Math.PI * 2); // actual drawn point, relative to screen size
    ctx.fill();
    ctx.restore();
}

// Debug - returns start and end of chain for any metro and some more stats
window.runDiagnostic = function() {
    console.group('🔍 RADAR DIAGNOSE');
    console.log(`Stationen: ${stations.length}, Fahrplan: ${schedule.length} Einträge`);
    schedule.forEach(entry => {
        const { chain, cumMs } = getChainData(entry.terminusStopId, entry.line, entry.direction);
        if (chain.length < 2) {
            console.error(`${entry.line} ${entry.direction}: Kette bricht ab!`);
        } else {
            const mins = Math.round(cumMs[cumMs.length-1] / 60_000);
            console.log(`${entry.line} ${entry.direction}: ${chain.length} St., ${mins} Min – ${chain[0].name} → ${chain[chain.length-1].name}`);
        }
    });
    const now = Date.now();
    let drawn = 0, waiting = 0;
    activeSimulations.forEach(s => ((now - s.startTime) / s.duration < 0 ? waiting++ : drawn++));
    console.log(`\nSimulationen: ${activeSimulations.size} total, ${drawn} aktiv, ${waiting} wartend`);
    console.groupEnd();
};

// inverts all labels (dark <=> white)
function setColorMode(mode) {
    colorMode = mode;
    document.querySelectorAll('.overlay-label img').forEach(el => {
        el.style.filter = mode === 'dark' ? 'invert(1)' : 'none';
    });
    document.body.dataset.theme = mode;
}

function initColorMode() { // if already set, default dark
    setColorMode(localStorage.getItem('colorMode') || 'dark');
}

window.toggleColorMode = function() {
    const next = colorMode === 'dark' ? 'light' : 'dark';
    localStorage.setItem('colorMode', next);
    setColorMode(next);
};

async function loadOverlay() {
    const file = (typeof OVERLAY_FILE !== 'undefined') ? OVERLAY_FILE : null; // OVERLAY_FILE defined in html
    if (!file) return;
    try {
        const raw = await fetch(file).then(r => r.json());
        overlayItems = Array.isArray(raw) ? raw : (raw.stations ?? raw);
        console.log(`Overlay: ${overlayItems.length} Stationen`);
        buildOverlayDOM();
    } catch(e) {
        console.warn('Overlay konnte nicht geladen werden:', e);
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

    for (const item of overlayItems) { // for every file 
        const el    = document.createElement('div'); // create new div
        el.className    = 'overlay-label';      // params of div
        el.dataset.pctX = item.pctX;
        el.dataset.pctY = item.pctY;
        el.dataset.pctW = item.pctW ?? 0;
        el.dataset.pctH = item.pctH ?? 0;
        el.title        = item.name;
        el.dataset.pctH = item.pctH ?? 0;
        el.title        = item.name;

        const imgEl        = document.createElement('img'); // insert file into div
        imgEl.src          = labelDir + (item.file ?? (item.name + '.png')); // params of img
        imgEl.alt          = item.name;
        imgEl.draggable    = false;
        imgEl.style.filter = colorMode === 'dark' ? 'invert(1)' : 'none';
        el.appendChild(imgEl);  // add to list as Child in container/ wrapper
        

        if (item.type === 'decoration') { // special case, where .png is literally just an image, but needed properties to adapt darkmode
            el.style.pointerEvents = 'none';
        } else {
            el.addEventListener('mouseenter', () => el.classList.add('hovered')); // add mouse events
            el.addEventListener('mouseleave', () => el.classList.remove('hovered'));
            el.addEventListener('click', e => {
                e.stopPropagation();
                if (item.type === 'venue') { openVenuePopup(item); return; } // defined in stations_overlay
                openDeparturePopup(item, el); // redirect
            });
        }

        container.appendChild(el); //appends full container
    }

    positionOverlayLabels(); //below
    watchImageResize(); // below below
    if (!img.complete) img.addEventListener('load', () => requestAnimationFrame(positionOverlayLabels));
}

// position exctracted from .pdf using seperate python script
function positionOverlayLabels() {
    const rect = img.getBoundingClientRect();
    if (rect.width === 0) return;
    for (const el of document.querySelectorAll('.overlay-label')) {
        el.style.left = `${rect.left + parseFloat(el.dataset.pctX) * rect.width}px`; //calc px based on rect
        el.style.top  = `${rect.top  + parseFloat(el.dataset.pctY) * rect.height}px`;
        const w = parseFloat(el.dataset.pctW), h = parseFloat(el.dataset.pctH);
        if (w > 0) el.style.width  = `${w * rect.width  * 0.7}px`;
        if (h > 0) el.style.height = `${h * rect.height * 0.7}px`;
    }
}

// watchdog/observer/listener if any resize happens
function watchImageResize() {
    if (typeof ResizeObserver === 'undefined') {
        window.addEventListener('resize', positionOverlayLabels);
        return;
    }
    new ResizeObserver(() => requestAnimationFrame(positionOverlayLabels)).observe(img);
    window.addEventListener('scroll', positionOverlayLabels, { passive: true });
}


function closePopup() {
    if (activePopup) { activePopup.remove(); activePopup = null; }
}

// if any text or symbol is clicked
async function openDeparturePopup(item, anchorEl) {
    closePopup(); // close previous popup if there is one

    let displayName, stopId;
    if (item.name.includes('|')) {
        [displayName, stopId] = item.name.split('|'); //filename and station_overlay names are different
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

    const popup = document.createElement('div'); // create popup
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
    document.getElementById('popupClose').onclick = closePopup; //if popup close is clicked, close
    document.addEventListener('click', closePopup, { once: true });
    positionPopup(popup, anchorEl);

    if (!stopId) { // if API or stations_overlay returns no stop id
        document.getElementById('popupBody').innerHTML =
            `<div class="popup-empty">„${displayName}" nicht gefunden</div>`;
        return;
    }

    try { // content of popup - via API
        const url = `https://www3.vvs.de/mngvvs/XML_DM_REQUEST` +
            `?outputFormat=rapidJSON` +
            `&type_dm=any` +
            `&name_dm=${stopId}` +
            `&mode=direct` +
            `&useRealtime=1` +
            `&limit=20` +
            `&itdDate=${getItdDate()}` +
            `&itdTime=${getItdTime()}` +
            `&t=${Date.now()}`;

        const data = await fetch(url).then(r => r.json());
        const list = (data.stopEvents || data.departures || [])
            .filter(e => {
                const name = e?.transportation?.disassembledName || '';
                return name && !isFernverkehr(name);
            })
            .slice(0, 20);

        const body = document.getElementById('popupBody');
        if (!body) return; // no body, nothing to do

        if (!list.length) { // list !== 0
            body.innerHTML = '<div class="popup-empty">Keine Abfahrten</div>';
        } else {
            body.innerHTML = list.map(e => { // makes each colum
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
                    : `<span class="dep-ontime">pünktlich</span>`; //different styling
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

// calculates where the popup should appear, to not stick out of the viewport
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

// special case for venues
function openVenuePopup(item) {
    window.open(item.venueLink, '_blank');
}

// loading bar while fetching Api at initialization
function setLoadingProgress(fraction) {
    const bar   = document.getElementById('loadingBar');
    const fill  = document.getElementById('loadingFill');
    const label = document.getElementById('loadingLabel');
    if (!bar) return;
    fill.style.width    = `${Math.round(fraction * 100)}%`;
    label.textContent   = fraction < 1 ? `Echtzeitdaten werden geladen … ${Math.round(fraction*100)}%` : '';
    if (fraction >= 1) {
        setTimeout(() => { bar.style.opacity = '0'; setTimeout(() => bar.style.display = 'none', 400); }, 300);
    } // bar is static, percentages at the right
}

// at resize (and init) get width/ height
const resize = () => { canvas.width = img.clientWidth; canvas.height = img.clientHeight; };

// will call the other functions which call other functions
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
        console.log(`${stations.length} Stationen geladen`);
    }

    const type         = getScheduleType();
    const scheduleFile = scheduleFiles?.[type] ?? legacyFile;
    const typeLabel    = { weekday: 'Werktag', saturday: 'Samstag', sunday: 'Sonn-/Feiertag' };
    console.log(`Fahrplan-Typ: ${typeLabel[type]}`);

    if (scheduleFile) { // defined in .html
        try {
            schedule = await fetch(scheduleFile).then(r => r.json());
            console.log(`Fahrplan (${typeLabel[type]}): ${schedule.length} Einträge`);
        } catch(e) { // first level errorhandling
            console.error('Fahrplan konnte nicht geladen werden:', e);
        }
    } else {
        console.warn('Kein Fahrplan für heute konfiguriert.');
    }

    resize();
    initColorMode();
    await loadOverlay();
    await updateEntireNetwork();
    setInterval(draw, 17); //draws every 17ms (~60fps/Hz)
    setInterval(updateEntireNetwork, 40_000); //update every 40s
}

window.onload   = init; // will start the cycle
window.onresize = resize; //if resize - resize