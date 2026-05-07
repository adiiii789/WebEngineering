// desktop_app/src/apps/RSSFeed.jsx
import React, { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';

const PROVIDERS = { // function for all news portals - made possible by https://api.rss2json.com (rate limits at ~5000, but no API-Key)
    tagesschau: {
        name: 'Tagesschau',
        color: '#003d80',
        fetch: async () => {
            const res  = await fetch('https://www.tagesschau.de/api2u/news/?regions=1&ressort=inland'); // Tagesschau has its own API for stuff like this
            const data = await res.json();
            return (data.news ?? []).map(item => {

                //Tagesschau delivers many image variants, it matches the ones which are 16:9
                const variants = item.teaserImage?.imageVariants ?? {};
                const image = (
                    variants['16x9-512']  ??
                    variants['16x9-640']  ??
                    variants['16x9-384']  ??
                    variants['16x9-960']  ??
                    Object.entries(variants).find(([k]) => k.startsWith('16x9'))?.[1] ??
                    null
                );

                return { // return normalized structure
                    title:   item.title,
                    summary: item.firstSentence ?? '',
                    url:     item.shareURL, // URL used for redirect
                    date:    new Date(item.date),
                    image, //own function to match
                };
            });
        }
    },
    swr: { //same struc
        name: 'SWR',
        color: '#009246',
        fetch: async () => {
            const rssUrl = encodeURIComponent('https://www.swr.de/~rss/index.xml');
            const res    = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`); // here is the magic component
            const data   = await res.json();
            return (data.items ?? []).map(item => ({
                title:   item.title,
                summary: item.description?.replace(/<[^>]*>/g, '').slice(0, 160) ?? '', //strips anything inside <...> using regex
                url:     item.link,
                date:    new Date(item.pubDate),
                image:   item.thumbnail || item.enclosure?.link || null,
            }));
        }
    },
    spiegel: { // same struc
        name: 'Spiegel',
        color: '#cc0000',
        fetch: async () => {
            const rssUrl = encodeURIComponent('https://www.spiegel.de/schlagzeilen/tops/index.rss');
            const res    = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);
            const data   = await res.json();
            return (data.items ?? []).map(item => ({
                title:   item.title,
                summary: item.description?.replace(/<[^>]*>/g, '').slice(0, 160) ?? '',
                url:     item.link,
                date:    new Date(item.pubDate),
                image:   item.thumbnail || item.enclosure?.link || null,
            }));
        }
    },
    zeit: { // same struc
        name: 'Zeit',
        color: '#000000',
        fetch: async () => {
            const rssUrl = encodeURIComponent('https://newsfeed.zeit.de/all');
            const res    = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);
            const data   = await res.json();
            return (data.items ?? []).map(item => ({
                title:   item.title,
                summary: item.description?.replace(/<[^>]*>/g, '').slice(0, 160) ?? '',
                url:     item.link,
                date:    new Date(item.pubDate),
                image:   item.thumbnail || item.enclosure?.link || null,
            }));
        }
    } // can be expanded
};
// main
export default function RSSFeed({ darkMode, onNavigate }) {
    const [provider, setProvider] = useState('tagesschau'); //default is the first one
    const [results, setResults]   = useState([]);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState(null);

    const load = async (key) => { // will be called as the App is opened
        setLoading(true);
        setError(null); // if error remained, clear
        setResults([]);
        try {
            setResults(await PROVIDERS[key].fetch()); // key are the providers, initial tagesschau
        } catch {
            setError('Fehler beim Laden');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(provider); }, [provider]); // if provider change, reload

    const bg      = !darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; //set it up the wrong way, thats why invert
    const bgHover = !darkMode ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
    const text    = !darkMode ? 'rgba(255,255,255,0.9)'  : 'rgba(0,0,0,0.9)';
    const muted   = !darkMode ? 'rgba(255,255,255,0.4)'  : 'rgba(0,0,0,0.4)';

    // main return
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} /*main wrapper*/>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', position: 'fixed' }}>
                {Object.entries(PROVIDERS).map(([key, p]) => ( // display all providers at the top
                    <button key={key} onClick={() => setProvider(key)} style={{
                        padding: '5px 14px', borderRadius: 20, fontSize: 11,
                        fontWeight: 'bold', border: 'none', cursor: 'pointer',
                        background: provider === key ? p.color : 'rgb(128,128,128)',
                        color:      provider === key ? '#fff'  : muted,
                        transition: 'all 0.15s',    
                    }}>
                        {p.name}
                    </button>
                ))}
                <button onClick={() => load(provider)} style={{ //reloads by calling load again
                    marginLeft: 'auto', background: 'none',
                    border: 'none', cursor: 'pointer', opacity: 0.4
                }}>
                    <RefreshCw size={13} />
                </button>
            </div>

            {loading && ( // if loading: placeholder
                <div style={{ textAlign: 'center', opacity: 0.4, fontSize: 12, padding: 32 }}>
                    Lädt…
                </div>
            )}
            {error && ( // if error: show error message
                <div style={{ textAlign: 'center', opacity: 0.4, fontSize: 12, padding: 32 }}>
                    {error}
                </div>
            )}

            {/*Article */}
            {!loading && results.map((item, i) => ( // show every article of selected provider
                <div // colum
                    key={i}
                    onClick={() => onNavigate?.(item.url)} // redirects url
                    style={{
                        background: bg, borderRadius: 16,
                        overflow: 'hidden', cursor: 'pointer',
                        transition: 'background 0.15s',
                        display: 'flex', flexDirection: 'column',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = bgHover} //small transition, defined above
                    onMouseLeave={e => e.currentTarget.style.background = bg} // default
                >
                    {/* image of article */}
                    {item.image && (
                        <img
                            src={item.image}
                            alt=""
                            style={{
                                width: '100%', height: 180,
                                objectFit: 'cover', display: 'block',
                            }}
                            onError={e => e.currentTarget.style.display = 'none'} //can't display image if it isn't there
                        />
                    )}

                    {/* Text */}
                    <div style={{ padding: '12px 14px', display: 'flex',
                                  justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: 13, fontWeight: 'bold',
                                color: text, marginBottom: 5, lineHeight: 1.35
                            }}>
                                {item.title} {/* title of article */}
                            </div>
                            <div style={{
                                fontSize: 11, color: muted,
                                lineHeight: 1.5, marginBottom: 6
                            }}>
                                {item.summary} {/* short summary */}
                            </div>
                            <div style={{ fontSize: 10, color: muted }}> 
                                {item.date.toLocaleDateString('de-DE', { // date of article
                                    day: 'numeric', month: 'short',
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </div>
                        </div>
                        <ExternalLink size={13} style={{ opacity: 0.3, flexShrink: 0, marginTop: 2 }} /* button for redirect, only optical, bc whole article redirects */ />
                    </div>
                </div>
            ))}
        </div>
    );
}