/**
 * components/Logo.js – Bildmarke von Quizzle: die Comic-Erde als Pixelbild
 *
 * 16 × 16 Pixel auf einer gelben Kachel mit schwarzem Rand: blaue Erde mit Kontinenten,
 * Gesicht (Augen, Wangen, Lächeln) und einer rosa Kartennadel als Hut. Gezeichnet aus Rechtecken
 * (shape-rendering crispEdges), damit es in jeder Größe scharfe Pixel bleibt.
 * Dasselbe Bild liegt als Browser-Symbol in app/icon.svg (mit `npm run logo` aus lib/logo-pixel.js erzeugt).
 */
import { pixelRechtecke } from '@/lib/logo-pixel';

export const PRODUKTNAME = 'Quizzle';

export default function Logo({ groesse = 36 }) {
  return (
    <span className="logo" style={{ '--logo-groesse': `${groesse}px` }} aria-hidden="true">
      <svg viewBox="0 0 20 20" shapeRendering="crispEdges">
        <rect width="20" height="20" rx="4" fill="#ffe08a" />
        <rect x=".5" y=".5" width="19" height="19" rx="3.6" fill="none" stroke="#1b1b1b" strokeWidth="1" shapeRendering="geometricPrecision" />
        <g className="logo-erde">
          {pixelRechtecke().map((r) => (
            <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.b} height="1" fill={r.farbe} />
          ))}
        </g>
      </svg>
    </span>
  );
}
