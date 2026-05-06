import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // draggable Windows
import { X, MapPin, Sun, Cloud, CloudRain, Search, CloudSun, CloudFog, CloudDrizzle, Snowflake, CloudSnow, CloudLightning, UserRound, Settings, BookMarked, Globe, Newspaper } from 'lucide-react'; // Icons

import ReCAPTCHA from 'react-google-recaptcha'

import { loginStyles, styles, weatherStyles, windowStyles } from './AppStyles.js';

import WikiApp from './apps/WikiApp';
import SettingsApp from './apps/SettingsApp';
import BrowserApp from './apps/BrowserApp';
import RSSFeed from './apps/RSSFeed';



const LoginScreen = ({ onLogin, darkMode }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [captchaDone, setCaptchaDone] = useState(false); // ← neu
    const [time, setTime]         = useState(new Date());
    
    const ls = loginStyles(darkMode)

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
            className={ls.wrapper}
            style={{ background: '#3c3c3c' }}
        >
            {/*Clock*/}
            <div className={ls.clockWrapper}>
                <span className={ls.clockMain}
                    style={{ fontSize: 56, letterSpacing: '-2px', lineHeight: 1 }}>
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={ls.clockWeekday}>
                    {time.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
            </div>

            <motion.form
                onSubmit={handleSubmit}
                className={ls.formWrapper}
                animate={error ? { x: [-8, 8, -6, 6, 0] } : {}}
                transition={{ duration: 0.35 }}
            >
                <div
                    className={ls.userPfp}
                    style={{ background: '#555', boxShadow: '0 0 0 3px rgba(255,255,255,0.1)' }}
                >
                    <UserRound size={36} className={ls.userPicture} />
                </div>

                <input
                    type="text"
                    placeholder="Benutzername"
                    autoFocus
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(''); }}
                    className={ls.inputUsername}
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
                    className={ls.inputPassword}
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: `1.5px solid ${error === 'Falsches Passwort' ? 'rgba(220,80,80,0.8)' : 'rgba(255,255,255,0.15)'}`,
                    }}
                />

                <ReCAPTCHA
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY} // Vite
                    theme={darkMode ? 'dark' : 'light'}
                    onChange={(token) => setCaptchaDone(token)}
                    onExpired={() => setCaptchaDone(false)}
                />

                {error && (
                    <span className={ls.inputIncorrect}>
                        {error}
                    </span>
                )}

                <button
                    type="submit"
                    className={ls.submitLogin}
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
    // -- States --

    // User Params
    const [login, setLogin]                 = useState(true);
    const [currentUser, setCurrentUser]     = useState('');
    const [darkMode, setDarkMode]           = useState(true);

    // App Params
    const [apps, setApps] = useState({ wiki: false, settings: false, browser: false, news: false, readme: true });
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

    const iframeRef = useRef(null);
    const [browser, setBrowser] = useState({ open: false, url: '' });



    // Stylesheets
    const s = styles(darkMode);
    const wes = weatherStyles(darkMode, isWeatherOpen);

    const openBrowser = (url) => {
        setBrowser({ open: true, url });
        setFocusedApp('browser');
    };

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

    // Sends darkmode to iframe (.html)
    useEffect(() => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ darkMode }, '*');
        }
    }, [darkMode]);

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

    switch (true) {
        case code === 0:                    return <Sun             size={size} className={wes.sun}            />;
        case code <= 3:                     return <CloudSun        size={size} className={wes.cloudSun}       />;
        case code === 45 || code === 48:    return <CloudFog        size={size} className={wes.cloudFog}       />;
        case code >= 51 && code <= 57:      return <CloudDrizzle    size={size} className={wes.cloudDrizzle}   />;
        case code >= 61 && code <= 67:      return <CloudRain       size={size} className={wes.cloudRain1}     />;
        case code >= 71 && code <= 77:      return <Snowflake       size={size} className={wes.snowFlake}      />;
        case code >= 80 && code <= 82:      return <CloudRain       size={size} className={wes.cloudRain2}     />;
        case code >= 85 && code <= 86:      return <CloudSnow       size={size} className={wes.cloudSnow}      />;
        case code >= 95:                    return <CloudLightning  size={size} className={wes.CloudLightning} />;
        default:                            return <Cloud           size={size} className={wes.cloud}          />;
    }

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

           <div
                className={s.body}
                style={{ filter: `brightness(${brightness}%)` }}
                onClick={() => setIsWeatherOpen(false)}
            >
                <iframe
                    ref={iframeRef}
                    src='Background_Stadtbahn/index.html'
                    className={s.iframe}
                    onLoad={() => {
                        const iwin = iframeRef.current?.contentWindow;
                        if (!iwin) return;
                        iwin.postMessage({ darkMode }, '*');
                        iwin.open = (url) => { openBrowser(url); return null; };
                        iwin.document.addEventListener('click', (e) => {
                            const a = e.target.closest('a[href]');
                            if (a?.href?.startsWith('http')) {
                                e.preventDefault();
                                openBrowser(a.href);
                            }
                        });
                    }}
                />

                <div
                    className={s.appWrapper}
                    style={{ pointerEvents: 'none' }}
                >
                    <Window
                        title='README'
                        isOpen={apps.readme}
                        onClose={() => toggleApp('readme')}
                        zIndex={focusedApp === 'readme' ? 100 : 50}
                        onFocus={() => setFocusedApp('readme')}
                        darkMode={darkMode}
                        style={{ top: '10%', left: '10%', width: '420px', pointerEvents: 'auto' }}
                    >
                        <div style={{
                            fontSize: 12,
                            lineHeight: 1.7,
                            color: darkMode ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.75)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                        }}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>Übersicht der Features:</div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {[
                                        ['Wikipedia',  'ähnlich implementiert wie bei Aufgaben. Mit internen Redirect und Web-Speech API (1P)'],
                                        ['Browser',    'nutzt iframe zum aufrufen, ist von meisten Websiten blockiert'],
                                        ['News',       'Nachrichten von Tagesschau, SWR, Spiegel & Zeit, nutzt das API-Tool "api.rss2json.com", hat ne restriction, aber kein API-Key (Tagesschau und Spiegel blocken CORS) (1P)'],
                                        ['Einstellungen', 'Spielerei wie Darkmode und Helligkeit'],
                                        ['Background', 'Interaktive Ubahnkarte, kann auf Stationsnamen und Symbole klicken (vielleicht 1/2P)'],
                                        ['Weather', 'Je nach Ortsangabe einfache Anzeige (1P)']
                                    ].map(([name, desc]) => (
                                        <div key={name} style={{ display: 'flex', gap: 8 }}>
                                            <span><strong>{name}</strong> — {desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontWeight: 'bold', marginBottom: 4, opacity: 0.5, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Thematik</div>
                                <div>Inspiriert von Linux oberfläche, speziell "Fedora Workstation"</div>
                            </div>
                        </div>
                    </Window>
                    <Window // function Window defined above
                        title='Wikipedia'
                        isOpen={apps.wiki}
                        onClose={() => {toggleApp('wiki')}}
                        zIndex = {focusedApp === 'wiki' ? 100 : 50} //dynamic z-Index for focused Window
                        onFocus = {() => {setFocusedApp('wiki')}}
                        darkMode={darkMode}
                        style={{
                            top: '10%',
                            left: '5%',
                            width: '50vh',
                            pointerEvents: 'auto'
                        }}
                    >
                            <WikiApp darkMode={darkMode} onLinkClick={openBrowser}/> {/* insert file ./apps/WikiApp.jsx*/}
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
                                width: '50vh',
                                pointerEvents: 'auto' 
                            }}
                        >
                            <SettingsApp
                                brightness={brightness}
                                setBrightness={setBrightness}
                                darkMode={darkMode}
                                setDarkMode={setDarkMode}
                            />
                        </Window>
                    </div>
                    <Window
                        title='Browser'
                        isOpen={browser.open}
                        onClose={() => setBrowser(b => ({ ...b, open: false }))}
                        zIndex={focusedApp === 'browser' ? 100 : 50}
                        onFocus={() => setFocusedApp('browser')}
                        darkMode={darkMode}
                        style={{ top: '5%', left: '15%', pointerEvents: 'auto', width: '70vw', maxWidth: '90%' }}
                    >
                        <BrowserApp
                            url={browser.url}
                            onNavigate={(url) => setBrowser(b => ({ ...b, url }))}
                        />
                    </Window>
                    <Window
                        title='News'
                        isOpen={apps.news}
                        onClose={() => toggleApp('news')}
                        zIndex={focusedApp === 'news' ? 100 : 50}
                        onFocus={() => setFocusedApp('news')}
                        darkMode={darkMode}
                        style={{ top: '10%', left: '30%', width: '80vh', pointerEvents: 'auto' }}
                    >
                        <RSSFeed darkMode={darkMode} onNavigate={openBrowser} />
                    </Window>
                </div>

                {/* Taskbar */}
                <div
                className={s.taskbar}
                >
                    <div className="flex gap-4"> {/* App Icons */}
                        <button onClick={() => toggleApp('settings')} className={s.taskbarButton}>
                            <Settings color={darkMode ? '#FFFFFF' : '#1f2937'} />
                        </button>
                        <button onClick={() => {
                            if (browser.open) {
                                setBrowser(b => ({ ...b, open: false }));
                            } else {
                                openBrowser(browser.url || 'public/Excercise/webex1.htm');
                            }
                            }} className={s.taskbarButton}
                        >
                            <Globe color={darkMode ? '#FFFFFF' : '#1f2937'} />
                        </button>
                        <button onClick={() => toggleApp('wiki')} className={s.taskbarButton}>
                            <BookMarked color={darkMode ? '#FFFFFF' : '#1f2937'} />
                        </button>
                        <button onClick={() => toggleApp('news')} className={s.taskbarButton}>
                            <Newspaper color={darkMode ? '#FFFFFF' : '#1f2937'} />
                        </button>
                    </div>
                    
                    {/* Weather-Clickable */}
                    <div
                        className={wes.clockWrapper}
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

                            className={wes.popupWrapper}
                            >
                            <div className={wes.popupInputWrapper}>
                                <MapPin className={wes.popupInputIcon} size={14} />
                                <input 
                                autoFocus 
                                type="text" 
                                placeholder="Stadt..." 
                                className={wes.popupInput}
                                value={cityInput} 
                                onChange={(e) => setCityInput(e.target.value)} 
                                onKeyDown={handleCitySearch} 
                                />
                            </div>
                            <div className={wes.forcastWrapper}>
                                {weather && weather.daily.time.slice(1, 6).map((date, i) => (
                                <div key={date} className={wes.forcastColum}>
                                    <span className={wes.forcastDate}>
                                    {new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(new Date(date))}
                                    </span>
                                    {getWeatherIcon(weather.daily.weather_code[i+1])}
                                    <span className={wes.forcastTemp}>
                                    {Math.round(weather.daily.temperature_2m_max[i+1])}°
                                    </span>
                                </div>
                                ))}
                            </div>
                            </motion.div>
                        )}
                        </AnimatePresence>
                        
                        <div className={s.taskbarTime}>
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <div className={s.taskbarUser}>
                            {currentUser}
                        </div>
                        </div>
                        
                    </div>
                </div>
            </div>
        </div>
    )
}