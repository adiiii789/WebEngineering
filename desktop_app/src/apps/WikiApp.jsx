// desktop_app/src/apps/WikiApp.jsx

import React, { useState, useEffect, useRef } from 'react';
import {Volume, Volume2, ExternalLink, WifiOff} from 'lucide-react'; // ExternalLink neu
import { WikiAppStyles } from '../AppStyles';

export default function WikiApp({darkMode, onLinkClick}) {

  // States
  const [search, setSearch]   = useState('');
  const [results, setResults] = useState([]);
  const [speaking, setSpeaking]   = useState(null);
  const recognitionRef = useRef(null);
  const skipNextEndRef  = useRef(false);
  const [networkError, setNetworkError] = useState(false);

  const style = WikiAppStyles(darkMode)

  // API Fetch
  useEffect(() => {
    if (search.length < 3) { setResults([]); setNetworkError(false); return; }
    const controller = new AbortController(); // as in App.jsx -> Abort if no connection (timeout)
    const debounce = setTimeout(async () => {
      const tid = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(
            `https://de.wikipedia.org/w/api.php` +
            `?action=query` +
            `&generator=prefixsearch` +
            `&gpslimit=4` +
            `&format=json` +
            `&prop=extracts|description|info` +
            `&inprop=url` +
            `&exintro=1` +
            `&explaintext=1` +
            `&exsentences=3` +
            `&origin=*` +
            `&gpssearch=${search}`,
            { signal: controller.signal }
        );
        const data = await res.json();
        if (data.query) setResults(Object.values(data.query.pages));
        setNetworkError(false);
      } catch (e) {
        if (e.name !== 'AbortError') setNetworkError(true);
      } finally {
        clearTimeout(tid);
      }
    }, 500);
    return () => { clearTimeout(debounce); controller.abort(); };
  }, [search]);

  // Web Speech API
  const speakText = (id, text) => {
    if (speaking === id) { // if the spoken text has the same id as the one before, terminate
      window.speechSynthesis.cancel();
      setSpeaking(null);
      return;
    }
    if (window.speechSynthesis.speaking) {
      skipNextEndRef.current = true;
      window.speechSynthesis.cancel(); // if its already speaking and function gets called again from other button, cancel it
    }
    const utter   = new SpeechSynthesisUtterance(text); //function for the speech api
    utter.lang    = 'de-DE';
    utter.rate    = 0.95;
    utter.onend   = () => { //when speech ends
      if (skipNextEndRef.current) { skipNextEndRef.current = false; return; }
      setSpeaking(null); //resets
    };
    utter.onerror = () => { // if error
      skipNextEndRef.current = false;
      setSpeaking(null); // resets
    };
    setSpeaking(id); //if passed all conditions, set speech id
    window.speechSynthesis.speak(utter); // speak
  };

  return ( // main return
    <div className={style.wrapper}>
      <input //at start will only show this
        type="text" placeholder="Suchen..." 
        className={style.searchbar}
        value={search} onChange={(e) => setSearch(e.target.value)} 
      />
      {networkError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: '#f87171', fontWeight: 'bold',
            padding: '6px 12px', borderRadius: 12,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <WifiOff size={12} /> Keine Verbindung zu Wikipedia
          </div>
      )}
      {results.map((p) => ( // if results come in, extend
        <div key={p.pageid} className={style.columWrapper} /*wrapper for each colum*/> 
          <div className={style.columTextWrapper}>
            <div>
              <h4 className={style.title}>{p.title}</h4> {/*Title in blue*/}
              <p className={style.content}>{p.extract}</p>
            </div>
            <div className={style.buttonWrapper} /*Buttons on the side*/> 
              <button
                onClick={() => speakText(p.pageid, p.extract || p.title)}
                className={style.speechAPIbutton}
                title={speaking === p.pageid ? 'Stoppen' : 'Vorlesen'}
              >
                {speaking === p.pageid ? <Volume2 /> : <Volume /> /*Changes the icon with a similar one, to seam seamless*/}
              </button>
              <a
                href={p.fullurl}
                onClick={(e) => { e.preventDefault(); onLinkClick?.(p.fullurl); } /*on Click redirects in a new tab */}
                className={style.redirectButton}
                style={{ cursor: 'pointer' }}
                title="Auf Wikipedia öffnen"
              >
                  <ExternalLink size={18} />
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}