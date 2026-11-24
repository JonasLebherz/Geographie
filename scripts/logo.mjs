/**
 * scripts/logo.mjs – schreibt app/icon.svg aus dem Pixelbild in lib/logo-pixel.js
 * Aufruf: npm run logo
 */
import { writeFileSync } from 'node:fs';
import { pixelRechtecke } from '../lib/logo-pixel.js';

const rechtecke = pixelRechtecke().map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.b}" height="1" fill="${r.farbe}"/>`).join('');
writeFileSync(
  'app/icon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" shape-rendering="crispEdges"><rect width="20" height="20" rx="4" fill="#ffe08a"/><rect x=".5" y=".5" width="19" height="19" rx="3.6" fill="none" stroke="#1b1b1b" stroke-width="1" shape-rendering="geometricPrecision"/>${rechtecke}</svg>\n`,
);
console.log('app/icon.svg geschrieben');
