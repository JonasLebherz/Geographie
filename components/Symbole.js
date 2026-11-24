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
