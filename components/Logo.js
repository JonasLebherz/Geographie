/**
 * components/Logo.js – Bildmarke des Geo-Quiz
 *
 * Dunkles, abgerundetes Quadrat mit einem Globus als feiner weißer Linie (Umriss,
 * Äquator, ein Längenkreis) und einem kleinen Zielpunkt: Hier liegt das gesuchte Land.
 * Fläche und Farben kommen aus dem CSS (.logo in app/globals.css).
 * Dieselbe Form liegt als Browser-Symbol in app/icon.svg.
 */
export const PRODUKTNAME = 'Geo-Quiz';

export default function Logo({ groesse = 30 }) {
  return (
    <span className="logo" style={{ '--logo-groesse': `${groesse}px` }} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17" opacity=".55" />
        <path d="M12 3.5c-2.6 2.4-3.9 5.2-3.9 8.5s1.3 6.1 3.9 8.5" opacity=".55" />
        <circle className="logo-punkt" cx="15.2" cy="9.2" r="1.9" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}
