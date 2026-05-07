import React, { 
    useState, 
    useEffect, 
    useRef, 
    useMemo, 
    useCallback 
} from 'react';

import { 
    motion, 
    AnimatePresence 
} from 'framer-motion';

import { 
    X, 
    MapPin, 
    Sun, 
    Cloud, 
    CloudRain, 
    CloudSun, 
    CloudFog, 
    CloudDrizzle,
    Snowflake, 
    CloudSnow, 
    CloudLightning, 
    UserRound, 
    Settings, 
    BookMarked,
    Globe, 
    Newspaper, 
    BookOpen, 
    LogOut 
} from 'lucide-react';

import ReCAPTCHA from 'react-google-recaptcha';

//Stylesheet
import { 
    loginStyles, 
    styles, 
    weatherStyles, 
    windowStyles 
} from './AppStyles.js';

// Apps
import WikiApp     from './apps/WikiApp';
import SettingsApp from './apps/SettingsApp';
import BrowserApp  from './apps/BrowserApp';
import RSSFeed     from './apps/RSSFeed';


// Cookies
const setCookie    = (name, value) => {
    document.cookie = `${name}=${value}; path=/; SameSite=Strict`;
};
const getCookie    = (name) => {
    const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return m ? m[2] : null;
};
const deleteCookie = (name) => {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

const LoginScreen = ({ onLogin, darkMode }) => {
    const [username,    setUsername]    = useState('');
    const [password,    setPassword]    = useState('');
    const [error,       setError]       = useState('');
    const [captchaDone, setCaptchaDone] = useState(false);
    const [time,        setTime]        = useState(new Date());

    const ls = loginStyles(darkMode);   //Stylesheet

    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000); // https://developer.mozilla.org/de/docs/Web/API/Window/setInterval -> refresh clock every 1s
        return () => clearInterval(t);                          // if unmounted, stop intervall to prevent mem-leak
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault(); // prevents reload of page
        setTimeout(() => setError(''), 2000); // resets error
        // return early method
        if (username.trim() === '')  return setError('Bitte einen Benutzernamen eingeben');
        if (!captchaDone)            return setError('Bitte das Captcha bestätigen');
        if (password === 'admin123') return onLogin(username, 'rich');
        if (password === 'guest')    return onLogin(username, 'poor');
        
        setError('Falsches Passwort');
    };

    // html for login Page at start
    return ( 
        <motion.div // framer motion - extends div with animations (only works with <AnimatePresence> in main, catches remove of element)
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(8px)' }} // from initial to exit
            transition={{ duration: 0.4 }}             // in 0.4s
            className={ls.wrapper}                     
            style={{ background: '#3c3c3c' }}
        >
            <div className={ls.clockWrapper}>
                <span className={ls.clockMain}
                    style={{ fontSize: 56, letterSpacing: '-2px', lineHeight: 1 }}>
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {/*sets clock*/}
                </span>
                <span className={ls.clockWeekday}>
                    {time.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })} {/*date below clock*/}
                </span>
            </div>

            <motion.form
                onSubmit={handleSubmit} // if submit button is successful clicked
                className={ls.formWrapper}
                animate={error ? { x: [-8, 8, -6, 6, 0] } : {}} // if error raised animate the shake
                transition={{ duration: 0.35 }}
            >
                <div className={ls.userPfp} // Picture above the inputs
                    style={{ background: '#006666', boxShadow: '0 0 0 3px rgba(255,255,255,0.1)' }}>
                    <UserRound size={36} className={ls.userPicture} /> {/*Symbol inside the bubble */}
                </div>

                <input type="text" placeholder="Benutzername" autoFocus
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(''); }} // if changed, reset error
                    className={ls.inputUsername}
                    minLength="3"
                    maxLength="10" //else half the page would be just the username
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: `1.5px solid ${error === 'Bitte einen Benutzernamen eingeben'
                            ? 'rgba(220,80,80,0.8)' : 'rgba(255,255,255,0.15)'}`, // border gets red if error
                    }}
                />
                <input type="password" placeholder="Passwort (= guest)" // same as above, but with password
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    className={ls.inputPassword}
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: `1.5px solid ${error === 'Falsches Passwort'
                            ? 'rgba(220,80,80,0.8)' : 'rgba(255,255,255,0.15)'}`,
                    }}
                />

                <ReCAPTCHA //gets key from .env, assuming using vite - using 3rd party npm module
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                    theme={darkMode ? 'dark' : 'light'}
                    onChange={(token) => setCaptchaDone(token)}
                    onExpired={() => setCaptchaDone(false)}
                />

                {error && <span className={ls.inputIncorrect}>{error}</span>} {/* print error underneath form*/}

                <button type="submit" className={ls.submitLogin} // submit button
                    style={{ background: '#5a5a5a', border: '1px solid rgba(255,255,255,0.15)' }}>
                    Login
                </button>
            </motion.form>
        </motion.div>
    );
};


// Window is the blueprint for all apps, sets the frame with draggable windows
const Window = ({ title, isOpen, onClose, children, zIndex, onFocus, style, darkMode }) => {
    const wis = windowStyles(darkMode); // seperate part of stylesheet
    return (
        <AnimatePresence /*Framer-Motion enable*/> 
            {isOpen && (
                <motion.div // div + animation purpose
                    drag dragMomentum={false}
                    onMouseDown={onFocus}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1,    opacity: 1 }}
                    exit={{    scale: 0.95, opacity: 0 }}
                    className={wis.wrapper}
                    style={{ ...style, zIndex }}
                >
                    <div className={wis.header} /*Wrapper of Titlename and exit button*/> 
                        <span className={wis.title}>{title}</span>
                        <button onClick={onClose} className={wis.closeBtn} /*return onclose to handle in main*/> 
                            <X size={16} />
                        </button>
                    </div>
                    <div className={wis.content} /*content of window will be inserted from main*/>
                        {children} 
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ─── APP ──────────────────────────────────────────────────────────────────────

export default function App() { // main function, base of what will be displayed

    // User
    const [login,       setLogin]       = useState(true);
    const [currentUser, setCurrentUser] = useState('');
    const [darkMode,    setDarkMode]    = useState(true);
    const [userRole,    setUserRole]    = useState(null); // 'rich' | 'poor'

    // Apps
    const [apps,       setApps]       = useState({ wiki: false, settings: false, browser: false, news: false, readme: true }); //list wich windows are open or closed
    const [focusedApp, setFocusedApp] = useState(''); // only one focused app, will be in front
    const [brightness, setBrightness] = useState(100); // for settings
    const [time,       setTime]       = useState(new Date());

    // Browser
    const [browser, setBrowser] = useState({ open: false, url: '' });

    //iframe
    const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 640);

    // Wetter
    const [weather,       setWeather]       = useState(null); // current weather
    const [city,          setCity]          = useState('Stuttgart'); //city default
    const [cityInput,     setCityInput]     = useState(''); //input from window
    const [coords,        setCoords]        = useState({ lat: 48.78232, lon: 9.17702 }); //default coords, will be overwritten
    const [isWeatherOpen, setIsWeatherOpen] = useState(false); // if window is displayerd
    const weatherRef = useRef(null); // avoids re-render
    const iframeRef  = useRef(null);

    // Styles
    const s   = styles(darkMode);
    const wes = weatherStyles(darkMode, isWeatherOpen);

    // get info from loginpage using cookies
    useEffect(() => {
        const role = getCookie('userRole');
        const name = getCookie('userName');
        if (role && name) {
            setUserRole(role);
            setCurrentUser(name);
            setLogin(false);
        }
    }, []);

    // set cookies after submit and close loginpage
    const handleLogin = (name, role) => {
        setCookie('userRole', role);
        setCookie('userName', name);
        setUserRole(role);
        setCurrentUser(name);
        setLogin(false);
    };
    // reset cookies and open loginpage
    const handleReLogin = () => {
        deleteCookie('userRole');
        deleteCookie('userName');
        setUserRole(null);
        setCurrentUser('');
        setLogin(true);
    };

    // resize for change from .html to .png
    useEffect(() => {
        const handleResize = () => setIsSmallScreen(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // sends darkmode value to background
    useEffect(() => { // "useEffect" renders with- and outside the schedule
        iframeRef.current?.contentWindow?.postMessage({ darkMode }, '*');
    }, [darkMode]);

    useEffect(() => { 
        const t = setInterval(() => setTime(new Date()), 1000); // updates clock every second
        const closeMenu = (e) => {
            if (weatherRef.current && !weatherRef.current.contains(e.target))   // close if click outside detected
                setIsWeatherOpen(false);
        };
        document.addEventListener('mousedown', closeMenu); //event listener for function above
        return () => { // if unmounted, clear
            clearInterval(t);
            document.removeEventListener('mousedown', closeMenu);
        };
    }, [isWeatherOpen]); // reloads if change

    // Weather API
    useEffect(() => {
        fetch(`https://api.open-meteo.com/v1/forecast` +
            `?latitude=${coords.lat}` +
            `&longitude=${coords.lon}` +
            `&current=temperature_2m,weather_code` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
            `&timezone=auto`
        )
            .then(r => r.json()) // parse args
            .then(data => setWeather(data)) //passes data into State
            .catch(console.error); // if error
    }, [coords]); // reruns if coords change

    const handleCitySearch = useCallback(async (e) => {
        if (e.key === 'Enter' && cityInput) { //if something is entered into the input in weather
            const res  = await fetch(`https://geocoding-api.open-meteo.com/v1/search` +
                                    `?name=${cityInput}` +
                                    `&count=1&language=de` +
                                    `&format=json`
                                );
            const data = await res.json();
            if (data.results) {
                setCoords({ lat: data.results[0].latitude, lon: data.results[0].longitude }); // use data from result
                setCity(data.results[0].name);
                setCityInput(''); // reset input
                setIsWeatherOpen(false); // close if set
            }
        }
    }, [cityInput]); // run if input

    // return early 
    const getWeatherIcon = (code) => { // https://open-meteo.com/en/docs - at the bottom the interpretation
        const size = 20;
        if (code === 0)                   return <Sun            size={size} className={wes.sun}           />; //matches code to icon
        if (code <= 3)                    return <CloudSun       size={size} className={wes.cloudSun}      />;
        if (code === 45 || code === 48)   return <CloudFog       size={size} className={wes.cloudFog}      />;
        if (code >= 51 && code <= 57)     return <CloudDrizzle   size={size} className={wes.cloudDrizzle}  />;
        if (code >= 61 && code <= 67)     return <CloudRain      size={size} className={wes.cloudRain1}    />;
        if (code >= 71 && code <= 77)     return <Snowflake      size={size} className={wes.snowFlake}     />;
        if (code >= 80 && code <= 82)     return <CloudRain      size={size} className={wes.cloudRain2}    />;
        if (code >= 85 && code <= 86)     return <CloudSnow      size={size} className={wes.cloudSnow}     />;
        if (code >= 95)                   return <CloudLightning size={size} className={wes.cloudLightning}/>;
        return                                   <Cloud          size={size} className={wes.cloud}         />;
    };

    const poorBlocked = ['wiki', 'settings', 'news', 'browser']; // which apps will be blocked with poor rights

    const toggleApp = (name) => { 
        if (userRole === 'poor' && poorBlocked.includes(name)) return; //returns if no access
        setApps(prev => ({ ...prev, [name]: !prev[name] })); // else proceed
        setFocusedApp(name); // new opened app is immediatly focused
    };

    const openBrowser = (url) => { // browser is a special case
        setBrowser({ open: true, url }); //opens link in browser
        setFocusedApp('browser');
    };

    const taskbarButtons = useMemo(() => [ // built to expand
        { name: 'settings', icon: Settings,  blocked: userRole === 'poor' },
        { name: 'wiki',     icon: BookMarked, blocked: userRole === 'poor' },
        { name: 'news',     icon: Newspaper,  blocked: userRole === 'poor' },
        { name: 'browser',  icon: Globe,      blocked: userRole === 'poor' },
    ], [userRole]);

    const taskbarRoleColor = userRole === 'rich' ? 'rgba(251,146,60,0.5)'   // rich -> orange
                           : userRole === 'poor' ? 'rgba(99,102,241,0.5)'   // poor -> indigo
                           : undefined;  // the bar, which separates taskbar and desktop
    // main Return
    return ( 
        <div className="w-full h-full" /*Full wrapper*/> 

            {/* Login */}
            <AnimatePresence>
                {login && ( // if login, show page
                    <LoginScreen onLogin={handleLogin} darkMode={darkMode} />
                )}
            </AnimatePresence>

            <div // div which handels brightness and close weather if clicked outside
                className={s.body}
                style={{ filter: `brightness(${brightness}%)` }}
                onMouseDown={(e) => {
                    if (e.detail > 1) e.preventDefault();
                    if (weatherRef.current && !weatherRef.current.contains(e.target))
                        setIsWeatherOpen(false);
                }}
            >
                {/* background iframe */}
                
                {isSmallScreen ? (
                    <iframe
                        src='alt_color_fade.html'
                        className={s.iframe}
                        style={{ border: 'none' }}
                    />
                ) : (
                    <iframe
                        ref={iframeRef}
                        src='Background_Stadtbahn/index.html'
                        className={s.iframe}
                        onLoad={() => {
                            const iwin = iframeRef.current?.contentWindow;
                            if (!iwin) return;
                            iwin.postMessage({ darkMode }, '*');
                            iwin.open = (url) => { openBrowser(url); return null; };
                            iwin.document.addEventListener('click', (e) => { // if link is clicked, catch it and display in Browser App
                                const a = e.target.closest('a[href]');
                                if (a?.href?.startsWith('http')) {
                                    e.preventDefault();
                                    openBrowser(a.href);
                                }
                            });
                            // if iframe is clicked, also close weather (was buggy)
                            iwin.document.addEventListener('mousedown', () => {
                                setIsWeatherOpen(false);
                            });
                        }}
                    />
                )}

                {/* display windows */}
                <div
                    className={s.appWrapper}
                    onMouseDown={(e) => {
                        if (weatherRef.current && !weatherRef.current.contains(e.target))
                            setIsWeatherOpen(false); // make sure weather is closed
                    }}
                    style={{ pointerEvents: 'none' }}
                >

                    <Window title='Wikipedia'
                        isOpen={apps.wiki} // pass args to app
                        onClose={() => toggleApp('wiki')}
                        zIndex={focusedApp === 'wiki' ? 100 : 50} //arrange z-index
                        onFocus={() => setFocusedApp('wiki')} 
                        darkMode={darkMode} // pass darkmode
                        style={{ top: '10%', left: '5%', width: '40vh', pointerEvents: 'auto' }} //no px
                    >
                        <WikiApp darkMode={darkMode} onLinkClick={openBrowser} /*icon clickable*//> 
                    </Window>

                    <div className={s.settingsWrapper} /*additional styling*/> 
                        <Window title='Einstellungen'
                            isOpen={apps.settings}
                            onClose={() => toggleApp('settings')}
                            zIndex={focusedApp === 'settings' ? 100 : 50}
                            onFocus={() => setFocusedApp('settings')}
                            darkMode={darkMode}
                            style={{ position: 'relative', width: '36vh', pointerEvents: 'auto' }}
                        >
                            <SettingsApp // definition of a getter/setter
                                brightness={brightness}
                                setBrightness={setBrightness}
                                darkMode={darkMode}
                                setDarkMode={setDarkMode}
                            />
                        </Window>
                    </div>

                    <Window title='Browser'
                        isOpen={browser.open}
                        onClose={() => setBrowser(b => ({ ...b, open: false }))}
                        zIndex={focusedApp === 'browser' ? 100 : 50}
                        onFocus={() => setFocusedApp('browser')}
                        darkMode={darkMode}
                        style={{ top: '5%', left: '15%', width: '70vw', maxWidth: '90vh', pointerEvents: 'auto' }}
                    >
                        <BrowserApp
                            url={browser.url}
                            onNavigate={(url) => setBrowser(b => ({ ...b, url }))}
                        />
                    </Window>

                    <Window title='News'
                        isOpen={apps.news}
                        onClose={() => toggleApp('news')}
                        zIndex={focusedApp === 'news' ? 100 : 50}
                        onFocus={() => setFocusedApp('news')}
                        darkMode={darkMode}
                        style={{ top: '5%', left: '25%', width: '48vh', pointerEvents: 'auto' }}
                    >
                        <RSSFeed darkMode={darkMode} onNavigate={openBrowser} />
                    </Window>

                    <Window title='README' // window with text inside, because it is no App, if closed only reopens on reload
                        isOpen={apps.readme}
                        onClose={() => toggleApp('readme')}
                        zIndex={focusedApp === 'readme' ? 100 : 50}
                        onFocus={() => setFocusedApp('readme')}
                        darkMode={darkMode}
                        style={{ top: '10%', left: '10%', width: '42vh', pointerEvents: 'auto' }}
                    >
                        <div style={{ // many divs because of many style changes
                            fontSize: 12, lineHeight: 1.7,
                            color: !darkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.75)',
                            display: 'flex', flexDirection: 'column', gap: 16,
                        }}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>Stuttgart Stadtbahn Radar</div>
                                <div>Echtzeit-Visualisierung der Stuttgarter Stadtbahn auf Basis von VVS-Fahrplandaten und Live-Delays.</div>
                            </div>
                            <div>
                                <div style={{ fontWeight: 'bold', marginBottom: 4, opacity: 0.5, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Apps</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {[
                                        ['Wikipedia',     'Artikel suchen und vorlesen lassen'],
                                        ['Browser',       'Webseiten eingebettet öffnen'],
                                        ['News',          'Nachrichten von Tagesschau, SWR, Spiegel & Zeit'],
                                        ['Einstellungen', 'Dark Mode & Helligkeit'],
                                    ].map(([name, desc]) => ( // just a list, a little overkill but interesting
                                        <div key={name} style={{ display: 'flex', gap: 8 }}>
                                            <span><strong>{name}</strong> — {desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontWeight: 'bold', marginBottom: 4, opacity: 0.5, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Benutzerrollen</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div><span style={{ color: '#fb923c', fontWeight: 'bold' }}>Rich (admin123)</span> — Vollzugriff auf alle Apps</div>
                                    <div><span style={{ color: '#818cf8', fontWeight: 'bold' }}>Poor (guest)</span> — Nur Karte, Uhr & Wetter</div>
                                </div>
                            </div>
                            <div>
                                <div style={{ fontWeight: 'bold', marginBottom: 4, opacity: 0.5, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hintergrund</div>
                                <div>Echtzeit darstellung der Ubahnen - Symbole verweisen zu links</div>
                            </div>
                        </div>
                    </Window>

                </div>

                {/* Taskbar */}
                <div
                    className={s.taskbar}
                    style={{ borderTopColor: taskbarRoleColor }}
                >
                    {/* App Buttons */}
                    <div className={`${s.taskbarIcons} taskbar-icons`}>
                        {taskbarButtons.map(({ name, icon: Icon, blocked }) => ( // creates the buttons for the apps
                            <button
                                key={name}
                                onClick={() => {
                                    if (name === 'browser') { // browser is still a special case
                                        if (blocked) return;
                                        if (browser.open) setBrowser(b => ({ ...b, open: false }));
                                        else openBrowser(browser.url || '/public/Excercise/webex1.htm');
                                    } else {
                                        toggleApp(name); // every other app
                                    }
                                }}
                                className={s.taskbarButton}
                                title={blocked ? 'Kein Zugriff (Poor User)' : undefined}
                                style={{
                                    opacity: blocked ? 0.25 : 1,
                                    cursor:  blocked ? 'not-allowed' : 'pointer',
                                }}
                            >
                                <Icon color={darkMode ? '#FFFFFF' : '#1f2937'} /*Icon defined in taskbarButtons*//>
                            </button>
                        ))}
                    </div>

                    {/*Weather and clock on right side*/}
                    <div className={wes.clockWrapper} ref={weatherRef}>

                        <button
                            onClick={(e) => {
                                if (userRole === 'poor') return;
                                setIsWeatherOpen(!isWeatherOpen); // no rights to change the weather
                            }}                                    // is more of a demonstration than practical
                            className={wes.button}
                            style={{ cursor: userRole === 'poor' ? 'default' : 'pointer' }} //visual
                        >
                            <div className={wes.taskbarContentTop}>
                                {weather?.current && getWeatherIcon(weather.current.weather_code) /*get code from func above*/}
                                <span className="tabular-nums">
                                    {weather?.current ? `${Math.round(weather.current.temperature_2m)}°C` : '--' /*show temp if data is there*/} 
                                </span>
                            </div>
                            <span className={wes.taskbarContentBot}>{city}</span> {/*Show current City in Taskbar*/}
                        </button>

                        {/* Weather popup */}
                        <AnimatePresence>
                            {isWeatherOpen && userRole === 'rich' && ( // popup ony pops up if rich user
                                <motion.div // framer motion for blend in and out
                                    initial={{ opacity: 0, y: 15 }} // and move up 
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{    opacity: 0, y: 15 }}
                                    className={wes.popupWrapper}
                                >
                                    <div className={wes.popupInputWrapper} /*Frame of input for city*/> 
                                        <MapPin className={wes.popupInputIcon} size={14} />
                                        <input
                                            autoFocus type="text" placeholder="Stadt..."
                                            className={wes.popupInput}
                                            value={cityInput}
                                            onChange={(e) => setCityInput(e.target.value)}
                                            onKeyDown={handleCitySearch} // after send update from API
                                        />
                                    </div>
                                    <div className={wes.forcastWrapper} /* ? to prevent crash if no data */>
                                        {weather?.daily && weather.daily.time.slice(1, 6).map((date, i) => ( // map data to colums
                                            <div key={date} className={wes.forcastColum}>
                                                <span className={wes.forcastDate}>
                                                    {new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(new Date(date)) /*if locales = [], its suddenly AM/PM */} 
                                                </span>
                                                {getWeatherIcon(weather.daily.weather_code[i + 1]) /*Show icon in the middle*/} 
                                                <span className={wes.forcastTemp}>
                                                    {Math.round(weather.daily.temperature_2m_max[i + 1]) /*offset because of API response*/}°
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/*Clock, Username and logout*/}
                        <div className={s.taskbarTime}>
                            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) /*feels random, now its not AM/PM*/}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                <span className={s.taskbarUser}>{currentUser}</span>
                                <button
                                    onClick={handleReLogin} //Kills the cookies, which brings login back up
                                    title="Re-Login"
                                    style={{ background: 'none', border: 'none',
                                             cursor: 'pointer', opacity: 0.4, padding: 2 }}
                                >
                                    <LogOut size={12} color={darkMode ? '#fff' : '#1f2937'} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div> 
    ); // feels like }}}}}}}}}}} in Java :>
}