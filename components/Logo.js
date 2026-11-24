/**
 * components/Logo.js – Bildmarke des Geo-Quiz (wie ein App-Symbol eines Spiels)
 *
 * Abgerundetes Quadrat mit Meeresblau-Verlauf, darin ein heller Globus (Umriss, Äquator,
 * Längenkreis) und eine gelbe Kartennadel mit kleinem Schatten – „hier ist es“.
 * Dieselbe Form liegt als Browser-Symbol in app/icon.svg.
 */
export const PRODUKTNAME = 'Geo-Quiz';

export default function Logo({ groesse = 34 }) {
  return (
    <span className="logo" style={{ '--logo-groesse': `${groesse}px` }} aria-hidden="true">
      <svg viewBox="0 0 32 32">
        <defs>
          <linearGradient id="logo-meer" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4a8dff" />
            <stop offset="1" stopColor="#1f49a8" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#logo-meer)" />
        <g fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity=".95">
          <circle cx="14.5" cy="17.5" r="8.5" />
          <path d="M6 17.5h17M14.5 9c-2.6 2.4-3.9 5.2-3.9 8.5s1.3 6.1 3.9 8.5" opacity=".6" />
        </g>
        <g className="logo-nadel">
          <ellipse cx="22.5" cy="17.2" rx="2.6" ry=".9" fill="#0d2a66" opacity=".35" />
          <path d="M22.5 16.8c-2.7-3.1-4.1-5.4-4.1-7.1a4.1 4.1 0 0 1 8.2 0c0 1.7-1.4 4-4.1 7.1z" fill="#ffcc33" stroke="#b8860b" strokeWidth=".8" />
          <circle cx="22.5" cy="9.7" r="1.5" fill="#ffffff" />
        </g>
      </svg>
    </span>
  );
}
