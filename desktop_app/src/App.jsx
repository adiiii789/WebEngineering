import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // draggablle Windows
import { X, MapPin, Sun, Cloud, CloudRain, Search } from 'lucide-react'; // Icons

import { styles, weatherStyles, windowStyles } from './AppStyles.js';

import WikiApp from './apps/WikiApp';
import SettingsApp from './apps/SettingsApp';

const Window = ({ title, isOpen, onClose, children, zIndex, onFocus, style, darkMode, focusedApp }) => {

    const wis = windowStyles(darkMode);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    drag dragMomentum={false} // Window after drop 
                    onMouseDown={onFocus} // At click focus Window
                    initial={{ 
                        scale: 0.95, 
                        opacity: 0 
                    }}
                    animate={{ 
                        scale: 1, 
                        opacity: 1 
                    }}
                    exit={{ 
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
    const [darkMode, setDarkMode]           = useState(true);

    const [apps, setApps]                   = useState({ wiki: false, settings: false});  // State which Windows are open
    const [focusedApp, setFocusedApp]       = useState('');                               // current Focused App (on top)
    const [brightness, setBrightness]       = useState(100);                              // Brightness as top layer, in %
    const [time, setTime]                   = useState(new Date());

    // Wetter States
    const [weather, setWeather]             = useState(null);
    const [city, setCity]                   = useState('Stuttgart');
    const [cityInput, setCityInput]         = useState('');
    const [coords, setCoords]               = useState({ lat: 52.52, lon: 13.41 });
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

    // TODO Stadt Suche


    const toggleApp = (name) => { //if App is closed
        setApps(prev => ({ ...prev, [name]: !prev[name] }));
        setFocusedApp(name);
    };

    return( // main Structure

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
                * All icons are stored in /icons/
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
                
                {/* Wetter-Button */}
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
                            className={wes.taskbarContentTop} // Degree in °C
                        >
                            <span 
                                className="tabular-nums"
                            >
                                {weather ? `${Math.round(weather.current.temperature_2m)}°C` : '--'}
                            </span>
                        </div>
                        <span 
                            className={wes.taskbarContentBot} // City name TODO Wetter Popover
                        >
                            {city}
                        </span>
                    </button>
                    

                </div>
            </div>
        </div>

    )
}