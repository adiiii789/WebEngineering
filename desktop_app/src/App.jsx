import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // draggable Windows
import { X, MapPin, Sun, Cloud, CloudRain, Search, CloudSun, CloudFog, CloudDrizzle, Snowflake, CloudSnow, CloudLightning, UserRound } from 'lucide-react'; // Icons

import ReCAPTCHA from 'react-google-recaptcha'

import { styles, weatherStyles, windowStyles } from './AppStyles.js';

import WikiApp from './apps/WikiApp';
import SettingsApp from './apps/SettingsApp';



const LoginScreen = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [captchaDone, setCaptchaDone] = useState(false); // ← neu
    const [time, setTime]         = useState(new Date());

    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (username.trim() === '') {
            setError('Bitte einen Benutzernamen eingeben');
        } else if (password !== '123') {
            setError('Falsches Passwort');
        } else if (!captchaDone) {
            setError('Bitte das Captcha bestätigen');
        } else {
            onLogin(username);
        }
        setTimeout(() => setError(''), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(8px)' }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-6"
            style={{ background: '#3c3c3c' }}
        >
            {/*Clock*/}
            <div className="absolute top-12 flex flex-col items-center select-none">
                <span className="text-white/90 font-light tabular-nums"
                    style={{ fontSize: 56, letterSpacing: '-2px', lineHeight: 1 }}>
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-white/40 text-sm mt-1">
                    {time.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
            </div>

            <motion.form
                onSubmit={handleSubmit}
                className="flex flex-col items-center gap-3"
                animate={error ? { x: [-8, 8, -6, 6, 0] } : {}}
                transition={{ duration: 0.35 }}
            >
                <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white/50 mb-2"
                    style={{ background: '#555', boxShadow: '0 0 0 3px rgba(255,255,255,0.1)' }}
                >
                    <UserRound size={36} className="mt-1" />
                </div>

                <input
                    type="text"
                    placeholder="Benutzername"
                    autoFocus
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(''); }}
                    className="rounded-lg px-4 py-2 text-sm text-white outline-none w-52 text-center"
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: `1.5px solid ${error === 'Bitte einen Benutzernamen eingeben' ? 'rgba(220,80,80,0.8)' : 'rgba(255,255,255,0.15)'}`,
                    }}
                />
                <input
                    type="password"
                    placeholder="Passwort = 123"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    className="rounded-lg px-4 py-2 text-sm text-white outline-none w-52 text-center tracking-widest placeholder:tracking-normal"
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: `1.5px solid ${error === 'Falsches Passwort' ? 'rgba(220,80,80,0.8)' : 'rgba(255,255,255,0.15)'}`,
                    }}
                />

                <ReCAPTCHA
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY} // Vite
                    theme="dark"
                    onChange={(token) => setCaptchaDone(token)}
                    onExpired={() => setCaptchaDone(false)}
                />

                {error && (
                    <span className="text-red-400 text-xs">{error}</span>
                )}

                <button
                    type="submit"
                    className="mt-1 px-8 py-2 rounded-lg text-sm font-medium text-white transition-all hover:brightness-110 active:scale-95"
                    style={{ background: '#5a5a5a', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                    Login
                </button>
            </motion.form>
        </motion.div>
    );
};

const Window = ({ title, isOpen, onClose, children, zIndex, onFocus, style, darkMode, focusedApp }) => {

    const wis = windowStyles(darkMode);

    return (
        <AnimatePresence> {/*catches remove of the component and plays exit animation*/}
            {isOpen && (
                <motion.div
                    drag dragMomentum={false} // Window should stay put instead of floating
                    onMouseDown={onFocus} // At click focus Window
                    initial={{ 
                        scale: 0.95, 
                        opacity: 0 
                    }}
                    animate={{ 
                        scale: 1, 
                        opacity: 1 
                    }}
                    exit={{ // triggers if isOpen === false
                        scale: 0.95, 
                        opacity: 0 
                    }}
                    className={wis.wrapper}
                    style={{ ...style, zIndex }}
                >
                    <div 
                        className={wis.header}
                    >
                    <span 
                    className={wis.title}
                    >
                    {title} 
                    </span>
                    <button 
                        onClick={onClose} 
                        className={wis.closeBtn}
                    >
                        <X size={16}/>
                    </button>
                    </div>
                        <div 
                            className={wis.content}
                        >
                        {children}
                        </div>
                </motion.div>
                )}
        </AnimatePresence>
    )
};
 
    
export default function App () {
    // States

    // User Params
    const [login, setLogin]                 = useState(true);
    const [currentUser, setCurrentUser]     = useState('');
    const [darkMode, setDarkMode]           = useState(true);

    // App Params
    const [apps, setApps]                   = useState({ wiki: false, settings: false});  // State which Windows are open
    const [focusedApp, setFocusedApp]       = useState('');                               // current Focused App (on top)
    const [brightness, setBrightness]       = useState(100);                              // Brightness as top layer, in %
    const [time, setTime]                   = useState(new Date());

    // Wetter States
    const [weather, setWeather]             = useState(null);
    const [city, setCity]                   = useState('Stuttgart');
    const [cityInput, setCityInput]         = useState('');
    const [coords, setCoords]               = useState({ lat: 48.78232, lon: 9.17702 });
    const [isWeatherOpen, setIsWeatherOpen] = useState(false);
    const weatherRef                        = useRef(null);

    // Stylesheets
    const s = styles(darkMode);
    const wes = weatherStyles(darkMode, isWeatherOpen);

    useEffect (() => { // activates on change
        const t = setInterval(() => setTime(new Date()), 1000); // Delay 1000 ms
        const closeMenu =  (e) => {
            if (weatherRef.current && !weatherRef.current.contains(e.target)) setIsWeatherOpen(false);
        };
        document.addEventListener("mousedown", closeMenu);
        return() => { 
            clearInterval(t);
            document.removeEventListener("mousedown", closeMenu);
        };
    }, []);

    // Weather API Fetch
    useEffect (() => {
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`)
            .then(res => res.json())
            .then(data => setWeather(data))
            .catch(console.error);
    }, [coords]);

    // sets City params if input
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
    // codes at the bottom of docs: https://open-meteo.com/en/docs
    const getWeatherIcon = (code) => {
    const size = 20;

    if (code === 0) return <Sun size={size} className="text-yellow-400" />;
    if (code <= 3) return <CloudSun size={size} className="text-gray-400" />;
    if (code === 45 || code === 48) return <CloudFog size={size} className="text-slate-400" />;
    if (code >= 51 && code <= 57) return <CloudDrizzle size={size} className="text-blue-300" />;
    if (code >= 61 && code <= 67) return <CloudRain size={size} className="text-blue-500" />;
    if (code >= 71 && code <= 77) return <Snowflake size={size} className="text-sky-200" />;
    if (code >= 80 && code <= 82) return <CloudRain size={size} className="text-blue-600" />;
    if (code >= 85 && code <= 86) return <CloudSnow size={size} className="text-blue-100" />;
    if (code >= 95) return <CloudLightning size={size} className="text-purple-500" />;

    return <Cloud size={size} className="text-gray-400" />;
    };


    const toggleApp = (name) => { //if App is closed
        setApps(prev => ({ ...prev, [name]: !prev[name] }));
        setFocusedApp(name);
    };

    return( // main Structure
        <div className="w-full h-full">

            {/* Login Screen — vor allem anderen */}
            <AnimatePresence>
            {login && (
                <LoginScreen
                onLogin={(name) => {
                    setLogin(false); 
                    setCurrentUser(name);
                }}
                darkMode={darkMode}
                />
            )}
            </AnimatePresence>

            <div // Body container
                className={s.body}
                style={{ filter: `brightness(${brightness}%)` }}
            >
                <iframe // set Dynamic Background
                    src='Background_Stadtbahn/index.html' 
                    className={s.iframe}
                >
                </iframe>
                
                {/* Desktop */}
                
                <div // Wrapper of Apps
                    className={s.appWrapper}
                    onClick={() => setIsWeatherOpen(false)} // if open, close tray widget
                >
                    <Window // function Window defined above
                        title='Wikipedia'
                        isOpen={apps.wiki}
                        onClose={() => {toggleApp('wiki')}}
                        zIndex = {focusedApp === 'wiki' ? 100 : 50} //dynamic z-Index for focused Window
                        onFocus = {() => {setFocusedApp('wiki')}}
                        darkMode={darkMode}
                        style={{
                            top: '10%',
                            left: '5%'
                        }}
                    >
                            <WikiApp /> {/* insert file ./apps/WikiApp.jsx*/}
                    </Window>
                    <div // Wrapper Settings
                        className={s.settingsWrapper}>
                        <Window
                            title='Einstellungen'
                            isOpen={apps.settings}
                            onClose={() => toggleApp('settings')}
                            zIndex = {focusedApp === 'settings' ? 100 : 50}
                            onFocus = {() => {setFocusedApp('settings')}}
                            darkMode={darkMode}
                            style={{
                                position: 'relative', 
                                pointerEvents: 'auto' 
                            }}
                        >
                            <SettingsApp brightness={brightness} setBrightness={setBrightness} darkMode = {darkMode} /> {/* insert file ./apps/SettingsApp.jsx*/}
                        </Window>
                    </div>
                </div>

                {/* Taskleiste */}
                <div
                className={s.taskbar}
                >
                    <div> {/* App Icons 
                    * All icons (except from lucide) are stored in /icons/
                    */}
                        <button  // Settings Icon and Button
                            onClick={() => toggleApp('settings')}
                            className={s.settingsButton}  
                        >
                            <img src='/icons/settings-icon.png' alt='S' />
                        </button>
                        <button  // Wiki Icon and Button
                            onClick={() => toggleApp('wiki')}
                            className={s.wikiButton}
                        >
                            <img src='/icons/wiki-icon.png' alt='W' />
                        </button>
                    </div>
                    
                    {/* Weather-Clickable */}
                    <div
                        className={wes.ClockWrapper}
                        ref={weatherRef}
                    >
                        <button // interactable with Weather display
                            onClick={(e) => {
                                e.stopPropagation(); // avoids Desktop-Event trigger
                                setIsWeatherOpen(!isWeatherOpen); // toggle
                            }}
                            className={wes.button}
                        >
                            <div
                                className={wes.taskbarContentTop}
                            >
                            {/*weather codes, defined above with website to decode*/}
                            {weather && getWeatherIcon(weather.current.weather_code) }
                                <span 
                                    className="tabular-nums"
                                >
                                    {weather ? `${Math.round(weather.current.temperature_2m)}°C` : '--'}
                                </span>
                            </div>
                            <span 
                                className={wes.taskbarContentBot} 
                            >
                            {/*City name*/}
                            {city}
                            </span>
                        </button>
                        
                        {/* Weather Popup */}
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
                        
                        <div className="text-center sm:text-xl font-light tracking-tighter border-l border-white/10 pl-4 sm:pl-6 tabular-nums">
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <div className='text-center brightness-40'>
                            {currentUser}
                        </div>
                        </div>
                        
                    </div>
                </div>
            </div>
        </div>
    )
}