/**
 * components/Symbole.js – kleine Linien-Symbole (wie SF Symbols: feine Linie, runde Enden)
 *
 * Als eigene SVGs statt einer Symbol-Schrift: nur das, was gebraucht wird, und kein
 * zusätzlicher Download. Alle übernehmen die Textfarbe (currentColor).
 */
const basis = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export function Chevron({ richtung = 'rechts', className = 'chevron' }) {
  return (
    <svg {...basis} className={className}>
      <path d={richtung === 'links' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  );
}

export function Lautsprecher({ an }) {
  return (
    <svg {...basis}>
      <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" />
      {an ? (
        <>
          <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
          <path d="M18 6.8a7.4 7.4 0 0 1 0 10.4" />
        </>
      ) : (
        <path d="M16 9.5l5 5M21 9.5l-5 5" />
      )}
    </svg>
  );
}

export function Plus() {
  return (
    <svg {...basis}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function Minus() {
  return (
    <svg {...basis}>
      <path d="M5 12h14" />
    </svg>
  );
}

/** Ganze Karte zeigen (vier Ecken nach außen) */
export function Einpassen() {
  return (
    <svg {...basis}>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

/** Person (Profil) */
export function Person() {
  return (
    <svg {...basis}>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.8 19.5c1.2-3.4 4-5.2 7.2-5.2s6 1.8 7.2 5.2" />
    </svg>
  );
}

/** Globus mit Pfeil (Spielen) */
export function Spielen() {
  return (
    <svg {...basis}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10 8.8v6.4l5.2-3.2z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Zwei Personen (Party) */
export function Gruppe() {
  return (
    <svg {...basis}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 18.5c.9-3 3-4.6 5.5-4.6s4.6 1.6 5.5 4.6" />
      <circle cx="16.5" cy="9.5" r="2.4" />
      <path d="M16.2 13.9c2.1.1 3.6 1.5 4.3 3.9" />
    </svg>
  );
}

/** Stern (Ergebnis); voll = ausgefüllt */
export function Stern({ voll }) {
  return (
    <svg {...basis} strokeWidth={1.6}>
      <path
        d="M12 3.2l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6-4.5-4.1 6-.7z"
        fill={voll ? 'currentColor' : 'none'}
      />
    </svg>
  );
}

/** Flamme (Serie richtiger Antworten) */
export function Flamme() {
  return (
    <svg {...basis} strokeWidth={1.6}>
      <path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.4 2.6-5 3.4-8.2.9 1.6 1.4 2.8 1.4 4.2 1.1-.8 2-2.6 2-5.4 3 2.1 5.2 5.4 5.2 9.2 0 3.4-2.4 5.8-6 5.8z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Link (Kopieren eines Einladungslinks) */
export function Kette() {
  return (
    <svg {...basis}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2" />
    </svg>
  );
}
