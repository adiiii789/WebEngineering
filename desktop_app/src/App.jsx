import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Sun, Cloud, CloudRain, Search } from 'lucide-react';

// Importiere deine separate App
import WikiApp from './apps/WikiApp';

// --- Fenster Komponente ---
const Window = ({ title, isOpen, onClose, children, zIndex, onFocus, style }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        drag dragMomentum={false}
        onMouseDown={onFocus}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="absolute w-[92vw] sm:w-[400px] bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/40 overflow-hidden"
        style={{ ...style, zIndex }}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-gray-200/20 cursor-grab active:cursor-grabbing">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{title}</span>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full"><X size={16}/></button>
        </div>
        <div className="p-8 max-h-[55vh] overflow-y-auto custom-scrollbar">{children}</div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default function Desktop() {
  // OS States
  const [apps, setApps] = useState({ wiki: false, settings: false });
  const [topApp, setTopApp] = useState("");
  const [brightness, setBrightness] = useState(100);
  const [time, setTime] = useState(new Date());

  // Wetter States
  const [weather, setWeather] = useState(null);
  const [city, setCity] = useState("Stuttgart");
  const [cityInput, setCityInput] = useState("");
  const [coords, setCoords] = useState({ lat: 52.52, lon: 13.41 });
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);
  const weatherRef = useRef(null);

  // Uhrzeit & Click-Outside
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    const closeMenu = (e) => {
      if (weatherRef.current && !weatherRef.current.contains(e.target)) setIsWeatherOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    return () => { clearInterval(t); document.removeEventListener("mousedown", closeMenu); };
  }, []);

  // Wetter API Fetch
  useEffect(() => {
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`)
      .then(res => res.json()).then(data => setWeather(data)).catch(console.error);
  }, [coords]);

  // Stadt Suche Logik
  const handleCitySearch = async (e) => {
    if (e.key === 'Enter' && cityInput) {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${cityInput}&count=1&language=de&format=json`);
      const data = await res.json();
      if (data.results) {
        setCoords({ lat: data.results[0].latitude, lon: data.results[0].longitude });
        setCity(data.results[0].name);
        setCityInput("");
        setIsWeatherOpen(false);
      }
    }
  };

  const getWeatherIcon = (code) => {
    if (code <= 3) return <Sun size={20} className="text-yellow-400" />;
    if (code <= 67) return <CloudRain size={20} className="text-blue-400" />;
    return <Cloud size={20} className="text-gray-400" />;
  };

  const toggleApp = (name) => {
    setApps(prev => ({ ...prev, [name]: !prev[name] }));
    setTopApp(name);
  };

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden flex flex-col bg-black font-sans select-none">
      
      {/* Lebendiger HTML Hintergrund */}
      <iframe 
        src="Background/index.html" 
        className="absolute inset-0 w-full h-full border-none pointer-events-none"
        style={{ filter: `brightness(${brightness}%)` }}
      />

      {/* Desktop Fenster-Bereich */}
      <div className="relative flex-grow p-4" onClick={() => setIsWeatherOpen(false)}>
        <Window title="Wikipedia" isOpen={apps.wiki} onClose={() => toggleApp('wiki')} zIndex={topApp === 'wiki' ? 100 : 50} onFocus={() => setTopApp('wiki')} style={{ top: '10%', left: '5%' }}>
          <WikiApp />
        </Window>

        <div className="absolute top-[10%] right-[5%] flex flex-col items-end pointer-events-none">
          <Window title="Einstellungen" isOpen={apps.settings} onClose={() => toggleApp('settings')} zIndex={topApp === 'settings' ? 100 : 50} onFocus={() => setTopApp('settings')} style={{ position: 'relative', pointerEvents: 'auto' }}>
            <div className="space-y-6">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Helligkeit</label>
              <input type="range" min="30" max="100" value={brightness} onChange={(e) => setBrightness(e.target.value)} className="w-full accent-blue-600" />
              <div className="text-[11px] text-gray-400">Wallpaper: background.html</div>
            </div>
          </Window>
        </div>
      </div>

      {/* Taskleiste */}
      <div className="h-16 w-full bg-white/10 backdrop-blur-3xl border-t border-white/20 flex items-center justify-between px-6 sm:px-10 z-[200]">
        
        {/* App Icons (Bilder aus /public/icons/) */}
        <div className="flex gap-4">
          <button onClick={() => toggleApp('settings')} className="w-11 h-11 rounded-2xl overflow-hidden hover:scale-110 transition-all shadow-lg active:scale-95">
            <img src="/icons/settings-icon.png" alt="Settings" className="w-full h-full object-cover" /> {/*https://upload.wikimedia.org/wikipedia/commons/d/dc/Settings-icon-symbol-vector.png*/}
          </button>
          <button onClick={() => toggleApp('wiki')} className="w-11 h-11 rounded-2xl overflow-hidden hover:scale-110 transition-all shadow-lg active:scale-95">
            <img src="/icons/wiki-icon.png" alt="Wiki" className="w-full h-full object-cover" /> {/*https://cdn-icons-png.flaticon.com/512/48/48927.png*/}
          </button>
          
        </div>

        {/* Wetter & Uhrzeit (Rechts) */}
<div className="flex items-center gap-4 sm:gap-6 text-white relative" ref={weatherRef}>
  
  {/* Wetter-Button */}
  <button 
    onClick={(e) => {
      e.stopPropagation(); // Verhindert, dass der Klick den Desktop-Event triggert
      setIsWeatherOpen(!isWeatherOpen);
    }}
    className={`flex flex-col items-end p-2 px-3 sm:px-4 rounded-2xl transition-all ${isWeatherOpen ? 'bg-white/20 shadow-inner' : 'hover:bg-white/10'}`}
  >
    <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
      {weather && getWeatherIcon(weather.current.weather_code)}
      <span className="tabular-nums">{weather ? `${Math.round(weather.current.temperature_2m)}°C` : '--'}</span>
    </div>
    <span className="text-[8px] sm:text-[9px] opacity-50 font-black uppercase tracking-widest leading-none">{city}</span>
  </button>

  {/* Wetter Popover */}
          <AnimatePresence>
            {isWeatherOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 15 }} 
                className="absolute bottom-20 right-0 w-64 bg-black/80 backdrop-blur-3xl rounded-[2.5rem] p-7 border border-white/10 shadow-2xl z-[150]"
              >
                <div className="relative mb-6">
                  <MapPin className="absolute left-3 top-3 text-white/30" size={14} />
                  <input 
                    autoFocus 
                    type="text" 
                    placeholder="Stadt..." 
                    className="w-full bg-white/10 border border-white/10 rounded-xl py-2 pl-9 pr-3 outline-none text-xs text-white focus:bg-white/20 transition-all" 
                    value={cityInput} 
                    onChange={(e) => setCityInput(e.target.value)} 
                    onKeyDown={handleCitySearch} 
                  />
                </div>
                <div className="space-y-4">
                  {weather && weather.daily.time.slice(1, 6).map((date, i) => (
                    <div key={date} className="flex items-center justify-between text-[11px]">
                      <span className="w-10 opacity-50 font-medium">
                        {new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(new Date(date))}
                      </span>
                      {getWeatherIcon(weather.daily.weather_code[i+1])}
                      <span className="font-bold w-8 text-right tabular-nums">
                        {Math.round(weather.daily.temperature_2m_max[i+1])}°
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DIE UHRZEIT (Jetzt immer sichtbar) */}
          <div className="text-lg sm:text-xl font-light tracking-tighter border-l border-white/10 pl-4 sm:pl-6 tabular-nums">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
}