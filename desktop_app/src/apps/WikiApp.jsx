// desktop_app/src/apps/WikiApp.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Volume, Volume2, ExternalLink } from 'lucide-react'; // ExternalLink neu
import { WikiAppStyles } from '../AppStyles';

export default function WikiApp({darkMode, onLinkClick}) {

  const [search, setSearch]   = useState('');
  const [results, setResults] = useState([]);
  const [speaking, setSpeaking]   = useState(null);
  const recognitionRef = useRef(null);
  const skipNextEndRef  = useRef(false);

  const style = WikiAppStyles(darkMode)
  
  useEffect(() => {
    if (search.length < 3) return;
    const t = setTimeout(async () => {
      // ↓ prop um "|info" ergänzt, inprop=url hinzugefügt
      const res = await fetch(
        `https://de.wikipedia.org/w/api.php?action=query&generator=prefixsearch&gpslimit=4&format=json` +
        `&prop=extracts|description|info&inprop=url` +
        `&exintro=1&explaintext=1&exsentences=3&origin=*&gpssearch=${search}`
      );
      const data = await res.json();
      if (data.query) setResults(Object.values(data.query.pages));
    }, 500);
    return () => clearTimeout(t);
  }, [search]);

  const speakText = (id, text) => {
    if (speaking === id) {
      window.speechSynthesis.cancel();
      setSpeaking(null);
      return;
    }
    if (window.speechSynthesis.speaking) {
      skipNextEndRef.current = true;
      window.speechSynthesis.cancel();
    }
    const utter   = new SpeechSynthesisUtterance(text);
    utter.lang    = 'de-DE';
    utter.rate    = 0.95;
    utter.onend   = () => {
      if (skipNextEndRef.current) { skipNextEndRef.current = false; return; }
      setSpeaking(null);
    };
    utter.onerror = () => {
      skipNextEndRef.current = false;
      setSpeaking(null);
    };
    setSpeaking(id);
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className={style.wrapper}>
      <input 
        type="text" placeholder="Suchen..." 
        className={style.searchbar}
        value={search} onChange={(e) => setSearch(e.target.value)} 
      />
      {results.map((p) => (
        <div key={p.pageid} className={style.columWrapper}>        {/* border-b, padding */}
          <div className={style.columTextWrapper}>                  {/* flex justify-between */}
            <div>
              <h4 className={style.title}>{p.title}</h4>
              <p className={style.content}>{p.extract}</p>
            </div>
            <div className={style.buttonWrapper}>                   {/* flex-col, selbst-streckend */}
              <button
                onClick={() => speakText(p.pageid, p.extract || p.title)}
                className={style.speechAPIbutton}
                title={speaking === p.pageid ? 'Stoppen' : 'Vorlesen'}
              >
                {speaking === p.pageid ? <Volume2 /> : <Volume />}
              </button>
              <a
                href={p.fullurl}
                onClick={(e) => { e.preventDefault(); onLinkClick?.(p.fullurl); }}
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