import React from 'react';

export default function Readme({ darkMode }) {

    return(
        <div style={{ // many divs because of many style changes
            fontSize: 12, lineHeight: 1.7,
            color: !darkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.75)',
            display: 'flex', flexDirection: 'column', gap: 16,
        }}>
            <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>Fenster öffnet sich beim Neuladen erneut!</div>
            <div>
                <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>Windows</div>
                <div>Die Fenster sind anklickbar und werden dabei auch fokussiert. Ebenfalls kann man diese verschieben ("draggable") und übereinanderlappen. known issues: die z-index logik ist nicht perfekt </div>
            </div>
            <div></div>
            <div>
                <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>Background</div>
                <div>Stuttgarter Stadtbahn (Ubahn) welche anhand des Fahrplans und der VVS API die Positionen der Züge interpoliert und als punkt darstellt. Namen der Stationen und Symbole (Stuttgarter Messe, MHPArena, Hauptbahnhof) auf der Karte anklickbar für Abfahrten und Verspätungen (Reine html/css/js eingebunden als iframe)</div>
            </div>
            <div>
                <div style={{ fontWeight: 'bold', marginBottom: 4, opacity: 0.5, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Apps</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                        ['Wikipedia',     'Funktion aus Übungen ohne Proxy, mit Speech API'],
                        ['Browser',       'Redirect links werden abgefangen und versucht im browser darzustellen. unter Home wird die Aufgabe angezeigt. (https:// wird ergänzt, .com aber nicht)'],
                        ['News',          'Nachrichten von Tagesschau, SWR, Spiegel & Zeit, nur SWR und Zeit erlauben eingebettete links'],
                        ['Einstellungen', 'Dark Mode & Helligkeit'],
                    ].map(([name, desc]) => ( // just a list, overkill but interesting
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
                    <div>Logout erfolgt über Symbol beim Namen unterhalb der Uhrzeit</div>
                </div>
            </div>
            <div>
                <div style={{ fontWeight: 'bold', marginBottom: 4, opacity: 0.5, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Wetter</div>
                <div>open-meteo.com stellt Wetterdaten ohne Key bereit, geocoding-api gibt eine Schnittstelle für Locations bereit</div>
            </div>
            <div>
                <div style={{ fontWeight: 'bold', marginBottom: 4, opacity: 0.5, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Responsive Design</div>
                <div>Bei unter 600 px wird zu einem einfachen platzhalter umgeschaltet, da die Karte dann kaum sichtbar ist</div>
            </div>
        </div>
    );
}