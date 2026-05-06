// desktop_app/src/apps/RSSFeed.jsx
import React, { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';

const PROVIDERS = {
    tagesschau: {
        name: 'Tagesschau',
        color: '#003d80',
        fetch: async () => {
            const res  = await fetch('https://www.tagesschau.de/api2u/news/?regions=1&ressort=inland');
            const data = await res.json();
            return (data.news ?? []).map(item => {

                // Alle verfügbaren Varianten durchsuchen, größte nehmen
                const variants = item.teaserImage?.imageVariants ?? {};
                const image = (
                    variants['16x9-512']  ??
                    variants['16x9-640']  ??
                    variants['16x9-384']  ??
                    variants['16x9-960']  ??
                    Object.entries(variants).find(([k]) => k.startsWith('16x9'))?.[1] ??
                    null
                );

                return {
                    title:   item.title,
                    summary: item.firstSentence ?? '',
                    url:     item.shareURL,
                    date:    new Date(item.date),
                    image,
                };
            });
        }
    },
    swr: {
        name: 'SWR',
        color: '#009246',
        fetch: async () => {
            const rssUrl = encodeURIComponent('https://www.swr.de/~rss/index.xml');
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
    spiegel: {
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
    zeit: {
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
    }
};

export default function RSSFeed({ darkMode, onNavigate }) {
    const [provider, setProvider] = useState('tagesschau');
    const [results, setResults]   = useState([]);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState(null);

    const load = async (key) => {
        setLoading(true);
        setError(null);
        setResults([]);
        try {
            setResults(await PROVIDERS[key].fetch());
        } catch {
            setError('Fehler beim Laden');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(provider); }, [provider]);

    const bg      = !darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
    const bgHover = !darkMode ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
    const text    = !darkMode ? 'rgba(255,255,255,0.9)'  : 'rgba(0,0,0,0.9)';
    const muted   = !darkMode ? 'rgba(255,255,255,0.4)'  : 'rgba(0,0,0,0.4)';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', position: 'fixed' }}>
                {Object.entries(PROVIDERS).map(([key, p]) => (
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
                <button onClick={() => load(provider)} style={{
                    marginLeft: 'auto', background: 'none',
                    border: 'none', cursor: 'pointer', opacity: 0.4
                }}>
                    <RefreshCw size={13} />
                </button>
            </div>

            {/* Laden / Fehler */}
            {loading && (
                <div style={{ textAlign: 'center', opacity: 0.4, fontSize: 12, padding: 32 }}>
                    Lädt…
                </div>
            )}
            {error && (
                <div style={{ textAlign: 'center', opacity: 0.4, fontSize: 12, padding: 32 }}>
                    {error}
                </div>
            )}

            {/* Artikel */}
            {!loading && results.map((item, i) => (
                <div
                    key={i}
                    onClick={() => onNavigate?.(item.url)}
                    style={{
                        background: bg, borderRadius: 16,
                        overflow: 'hidden', cursor: 'pointer',
                        transition: 'background 0.15s',
                        display: 'flex', flexDirection: 'column',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = bgHover}
                    onMouseLeave={e => e.currentTarget.style.background = bg}
                >
                    {/* Bild */}
                    {item.image && (
                        <img
                            src={item.image}
                            alt=""
                            style={{
                                width: '100%', height: 180,
                                objectFit: 'cover', display: 'block',
                            }}
                            onError={e => e.currentTarget.style.display = 'none'}
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
                                {item.title}
                            </div>
                            <div style={{
                                fontSize: 11, color: muted,
                                lineHeight: 1.5, marginBottom: 6
                            }}>
                                {item.summary}
                            </div>
                            <div style={{ fontSize: 10, color: muted }}>
                                {item.date.toLocaleDateString('de-DE', {
                                    day: 'numeric', month: 'short',
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </div>
                        </div>
                        <ExternalLink size={13} style={{ opacity: 0.3, flexShrink: 0, marginTop: 2 }} />
                    </div>
                </div>
            ))}
        </div>
    );
}