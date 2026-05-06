import React, { useState, useEffect, useRef } from 'react';
import { RotateCw, ExternalLink, AlertTriangle } from 'lucide-react';

export default function BrowserApp({ url, onNavigate }) {
    const [input, setInput]     = useState(url);
    const [loading, setLoading] = useState(true);
    const [blocked, setBlocked] = useState(false);
    const iframeRef             = useRef(null);
    const timerRef              = useRef(null);

    useEffect(() => {
        setInput(url);
        setLoading(true);
        setBlocked(false);

        // Timeout-Fallback für geblockte Seiten
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setBlocked(true);
            setLoading(false);
        }, 6000);

        return () => clearTimeout(timerRef.current);
    }, [url]);

    const handleLoad = () => {
        clearTimeout(timerRef.current);
        setLoading(false);
        setBlocked(false);

        // Links im iframe abfangen
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
            // Cross-origin — kein Zugriff, ignorieren
        }
    };

    const navigate = () => {
        let target = input.trim();
        if (!target.startsWith('http')) target = 'https://' + target;
        onNavigate(target);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* URL-Leiste */}
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
                    onClick={() => onNavigate(url)}
                    style={{ opacity: 0.5, cursor: 'pointer', background: 'none', border: 'none' }}
                    title="Neu laden"
                >
                    <RotateCw size={14} />
                </button>
                <a href={url} target="_blank" rel="noopener noreferrer"
                    style={{ opacity: 0.5, cursor: 'pointer' }}
                    title="Im Browser öffnen"
                >
                    <ExternalLink size={14} />
                </a>
            </div>

            {/* iframe / Fallback */}
            <div style={{ position: 'relative', width: '100%', height: 420 }}>

                {loading && !blocked && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 12, opacity: 0.4
                    }}>
                        Lädt…
                    </div>
                )}

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
                            href={p.fullurl}
                            onClick={(e) => { e.preventDefault(); onLinkClick?.(p.fullurl); }}
                            className={style.redirectButton}
                            style={{ cursor: 'pointer' }}
                            title="Auf Wikipedia öffnen"
                        >
                            <ExternalLink size={18} />
                        </a>
                    </div>
                )}

                <iframe
                    key={url}
                    ref={iframeRef}
                    src={url}
                    onLoad={handleLoad}
                    style={{
                        width: '100%', height: '100%',
                        border: 'none', borderRadius: 10,
                        opacity: loading || blocked ? 0 : 1,
                        transition: 'opacity 0.2s',
                    }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
            </div>
        </div>
    );
}