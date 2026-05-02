import React, { useState, useEffect, useRef } from 'react';
import { Volume, Volume2 } from 'lucide-react';

export default function WikiApp() {

  const [search, setSearch]   = useState('');
  const [results, setResults] = useState([]);
  const [speaking, setSpeaking]   = useState(null); // pageid of active speaker
  const recognitionRef = useRef(null);
  const skipNextEndRef  = useRef(false);
  
  useEffect(() => {
    if (search.length < 3) return;
    const t = setTimeout(async () => {
      const res = await fetch(`https://de.wikipedia.org/w/api.php?action=query&generator=prefixsearch&gpslimit=4&format=json&prop=extracts|description&exintro=1&explaintext=1&exsentences=3&origin=*&gpssearch=${search}`);
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
    <div className="space-y-4">
      <input 
        type="text" placeholder="Suchen..." 
        className="w-full bg-black/5 rounded-xl p-3 outline-none border border-black/5 focus:bg-white transition-all text-sm"
        value={search} onChange={(e) => setSearch(e.target.value)} 
      />
      {results.map((p) => (
        <div key={p.pageid} className="p-2 border-b border-black/5 last:border-0">
          <div className="flex justify-between items-start gap-2">
            <div>
              <h4 className="font-bold text-blue-600 text-sm">{p.title}</h4>
              <p className="text-xs opacity-70 leading-relaxed line-clamp-3">
                {p.extract}
              </p>
            </div>
            <button
              onClick={() => speakText(p.pageid, p.extract || p.title)}
              className="shrink-0 text-xs opacity-50 hover:opacity-100 transition-opacity"
              title={speaking === p.pageid ? 'Stoppen' : 'Vorlesen'}
            >
              {speaking === p.pageid ? <Volume2/> : <Volume/>}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}