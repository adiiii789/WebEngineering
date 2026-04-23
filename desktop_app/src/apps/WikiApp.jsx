import React, { useState, useEffect } from 'react';

export default function WikiApp() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (search.length < 3) return;
    const t = setTimeout(async () => {
      const res = await fetch(`https://de.wikipedia.org/w/api.php?action=query&generator=prefixsearch&gpslimit=4&format=json&prop=extracts|description&exintro=1&explaintext=1&exsentences=3&origin=*&gpssearch=${search}`);
      const data = await res.json();
      if (data.query) setResults(Object.values(data.query.pages));
    }, 500);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-4">
      <input 
        type="text" placeholder="Suchen..." 
        className="w-full bg-black/5 rounded-xl p-3 outline-none border border-black/5 focus:bg-white transition-all text-sm"
        value={search} onChange={(e) => setSearch(e.target.value)} 
      />
      {results.map(p => (
        <div key={p.pageid} className="p-2 border-b border-black/5 last:border-0">
          <h4 className="font-bold text-blue-600 text-sm">{p.title}</h4>
          <p className="text-xs opacity-70 leading-relaxed line-clamp-3">{p.extract}</p>
        </div>
      ))}
    </div>
  );
}