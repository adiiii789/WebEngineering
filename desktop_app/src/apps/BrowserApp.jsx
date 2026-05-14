import React, { useState, useEffect, useRef } from 'react';
import { RotateCw, ExternalLink, AlertTriangle, WifiOff, House } from 'lucide-react';

// you could implement a workaround for sites blocked because they detect an embed,
// but there is the option to open it in a new tab
// if you really want to make it work, there are browser-extensions
export default function BrowserApp({ url, onNavigate }) {
    const [input,        setInput]        = useState(url);
    const [loading,      setLoading]      = useState(true);
    const [blocked,      setBlocked]      = useState(false);
    const [networkError, setNetworkError] = useState(false);
    const iframeRef = useRef(null);
    const timerRef  = useRef(null);

    useEffect(() => {
        if (!url) return;
        setInput(url);
        setLoading(true);
        setBlocked(false);
        setNetworkError(false);

        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(async () => {
            // fast-path: browser already knows we're offline
            if (!navigator.onLine) {
                setNetworkError(true);
                setLoading(false);
                return;
            }
            // ping a known endpoint to distinguish "site blocks embed" from "no internet"
            try {
                await fetch('https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&current=temperature_2m',
                    { signal: AbortSignal.timeout(3000) }
                );
                // reachable → site is blocking embed
                setBlocked(true);
            } catch {
                // not reachable → no internet
                setNetworkError(true);
            }
            setLoading(false);
        }, 3000);

        return () => clearTimeout(timerRef.current);
    }, [url]);

    const handleLoad = () => {
        clearTimeout(timerRef.current);
        setLoading(false);
        setBlocked(false);
        setNetworkError(false);

        // catch outgoing links
        try {
            const iwin = iframeRef.current?.contentWindow;
            if (!iwin) return;
            iwin.document.addEventListener('click', (e) => {
                const a = e.target.closest('a[href]');
                if (!a) return;
                const href = a.href;
                if (href?.startsWith('http')) {
                    e.preventDefault();
                    onNavigate(href);
                }
            });
        } catch {
            // CORS, cant do anything about it
        }
    };

    // if no http prefix, add it
    const navigate = () => {
        let target = input.trim();
        if (!target.startsWith('http')) target = 'https://' + target;
        onNavigate(target);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* URL-Bar */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && navigate()}
                    style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.08)',
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: 10,
                        padding: '6px 10px',
                        fontSize: 11,
                        outline: 'none',
                    }}
                />
                <button
                    onClick={() => onNavigate('/Excercise/webex1.htm')}
                    style={{ opacity: 0.5, cursor: 'pointer', background: 'none', border: 'none' }}
                    title="webex1.htm"
                >
                    <House size={14} />
                </button>
                <button
                    onClick={() => onNavigate(url)}
                    style={{ opacity: 0.5, cursor: 'pointer', background: 'none', border: 'none' }}
                    title="Neu laden"
                >
                    <RotateCw size={14} />
                </button>
                <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ opacity: 0.5, cursor: 'pointer' }}
                title="Im Browser öffnen"
                >
                <ExternalLink size={14} />
            </a>
        </div>

    {/* iframe / Fallbacks */}
    <div style={{ position: 'relative', width: '100%', height: 420 }}>

        {/* loading placeholder */}
        {loading && !blocked && !networkError && (
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 12, opacity: 0.4
            }}>
                Lädt…
            </div>
        )}

        {/* site blocks embedding */}
        {blocked && (
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 12, padding: 24, textAlign: 'center'
            }}>
                <AlertTriangle size={28} style={{ opacity: 0.4 }} />
                <span style={{ fontSize: 12, opacity: 0.6 }}>
                            Diese Seite erlaubt keine Einbettung.
                        </span>
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                fontSize: 12, padding: '7px 16px', borderRadius: 10,
                background: 'rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.1)',
                cursor: 'pointer', textDecoration: 'none',
                color: 'inherit', display: 'flex',
                alignItems: 'center', gap: 6,
                }}
                >
                <ExternalLink size={12} />
                In neuem Tab öffnen
            </a>
            </div>
            )}

{/* no internet connection */}
{networkError && (
    <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 12, padding: 24, textAlign: 'center'
    }}>
        <WifiOff size={28} style={{ opacity: 0.4 }} />
        <span style={{ fontSize: 12, opacity: 0.6 }}>
                            Keine Internetverbindung
                        </span>
        <button
            onClick={() => {
                setNetworkError(false);
                setLoading(true);
                onNavigate(url);
            }}
            style={{
                fontSize: 12, padding: '7px 16px', borderRadius: 10,
                background: 'rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.1)',
                cursor: 'pointer', color: 'inherit',
            }}
        >
            Erneut versuchen
        </button>
    </div>
)}

{/* iframe — only render if url exists */}
{url && (
    <iframe
        key={url}
        ref={iframeRef}
        src={url}
        onLoad={handleLoad}
        style={{
            width: '100%', height: '100%',
            border: 'none', borderRadius: 10,
            opacity: loading || blocked || networkError ? 0 : 1,
            transition: 'opacity 0.2s',
            pointerEvents: loading || blocked || networkError ? 'none' : 'auto', // ← neu
        }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
)}

{/* no url given */}
{!url && (
    <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 12, opacity: 0.4
    }}>
        Keine URL angegeben
    </div>
)}

</div>
</div>
);
}