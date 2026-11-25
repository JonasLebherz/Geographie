/**
 * components/Avatar.js – kleine Comic-Figur zum Zusammenstellen (Profil, Party)
 *
 * Gezeichnet aus Teilen mit dicker schwarzer Kontur und flachen Farben (passend zum Comic-Stil):
 * Haut, Frisur (Form und Farbe), Augen, Mund, Kleidung (Form und Farbe), Extra (Brille, Mütze …).
 * Gespeichert als kurzer Text, z. B. „2.1.4.0.1.3.2.5“ – je Teil die Nummer der Wahl (AVATAR_TEILE).
 * pose: 'normal' | 'jubel' (Arme hoch, Mund offen) | 'daumen' (Daumen hoch) | 'oh' (Hände an den Kopf)
 * – die Posen sind die Jubel-Emotes in der Party.
 */

export const HAUT = ['#f9d7b9', '#f1c19b', '#d99c6c', '#b97a4b', '#8c5a34', '#5e3b22'];
export const HAARFARBE = ['#1b1b1b', '#5b3a1e', '#a0612c', '#e3b24f', '#d9512b', '#9a9aa3', '#6c4ad0', '#2f9e8f'];
export const KLEIDFARBE = ['#5b47a8', '#e9505a', '#2f7fb5', '#f2b632', '#3f9b5b', '#ef7fae', '#1b1b1b', '#f6f1e7'];

/** Teile mit Anzahl der Möglichkeiten (Reihenfolge = Reihenfolge im gespeicherten Text) */
export const AVATAR_TEILE = [
  { name: 'haut', titel: 'Haut', anzahl: HAUT.length, farbe: HAUT },
  { name: 'frisur', titel: 'Frisur', anzahl: 7 },
  { name: 'haarfarbe', titel: 'Haarfarbe', anzahl: HAARFARBE.length, farbe: HAARFARBE },
  { name: 'augen', titel: 'Augen', anzahl: 5 },
  { name: 'mund', titel: 'Mund', anzahl: 5 },
  { name: 'kleidung', titel: 'Kleidung', anzahl: 4 },
  { name: 'kleidfarbe', titel: 'Farbe', anzahl: KLEIDFARBE.length, farbe: KLEIDFARBE },
  { name: 'extra', titel: 'Extra', anzahl: 7 },
];

/** Text → { haut, frisur, … } (fehlende oder kaputte Werte: Standard) */
export function avatarLesen(text) {
  const werte = String(text ?? '').split('.').map(Number);
  const standard = [1, 1, 1, 0, 0, 0, 0, 0];
  return Object.fromEntries(
    AVATAR_TEILE.map((teil, i) => {
      const w = werte[i];
      return [teil.name, Number.isInteger(w) && w >= 0 && w < teil.anzahl ? w : standard[i]];
    }),
  );
}

export const avatarText = (a) => AVATAR_TEILE.map((teil) => a[teil.name] ?? 0).join('.');

/** Zufällige Figur (für Gäste ohne eigene) – aus einer Kennung, damit sie stabil bleibt */
export function avatarAus(kennung) {
  let h = 0;
  for (const z of String(kennung)) h = (h * 31 + z.charCodeAt(0)) >>> 0;
  return AVATAR_TEILE.map((teil) => {
    h = (h * 1103515245 + 12345) >>> 0;
    return (h >>> 8) % teil.anzahl;
  }).join('.');
}

const K = '#1b1b1b'; // Kontur
const strich = { stroke: K, strokeWidth: 2.4, strokeLinejoin: 'round', strokeLinecap: 'round' };

function Kleidung({ art, farbe }) {
  const hell = farbe === '#f6f1e7' || farbe === '#f2b632';
  const naht = hell ? K : 'rgba(0,0,0,.35)';
  if (art === 1) {
    // Kapuzenpulli
    return (
      <g>
        <path d="M10 64c0-12 9-19 22-19s22 7 22 19z" fill={farbe} {...strich} />
        <path d="M22 47c2 6 6 9 10 9s8-3 10-9" fill="none" stroke={naht} strokeWidth="2" />
        <path d="M29 56v6M35 56v6" stroke={naht} strokeWidth="2" strokeLinecap="round" />
      </g>
    );
  }
  if (art === 2) {
    // Hemd mit Kragen
    return (
      <g>
        <path d="M10 64c0-12 9-19 22-19s22 7 22 19z" fill={farbe} {...strich} />
        <path d="M24 46l8 8 8-8-3-3h-10z" fill="#fff" {...strich} strokeWidth="2" />
        <path d="M32 54v10" stroke={naht} strokeWidth="2" />
      </g>
    );
  }
  if (art === 3) {
    // Ringelpulli
    return (
      <g>
        <path d="M10 64c0-12 9-19 22-19s22 7 22 19z" fill={farbe} {...strich} />
        <path d="M13 55h38M11 61h42" stroke={hell ? '#5b47a8' : '#fff'} strokeWidth="3" />
        <path d="M10 64c0-12 9-19 22-19s22 7 22 19z" fill="none" {...strich} />
      </g>
    );
  }
  // T-Shirt
  return (
    <g>
      <path d="M10 64c0-12 9-19 22-19s22 7 22 19z" fill={farbe} {...strich} />
      <path d="M26 46c2 3 4 4 6 4s4-1 6-4" fill="none" stroke={naht} strokeWidth="2" />
    </g>
  );
}

function FrisurHinten({ art, farbe }) {
  if (art === 2) return <path d="M15 30c0 14 3 22 6 24h22c3-2 6-10 6-24z" fill={farbe} {...strich} />; // lang
  if (art === 4) return <path d="M44 18c8 0 12 8 9 15-2 4-5 5-8 4" fill={farbe} {...strich} />; // Zopf
  return null;
}

function FrisurVorne({ art, farbe }) {
  switch (art) {
    case 0: // kurz
      return <path d="M17 28c0-11 7-17 15-17s15 6 15 17c-4-5-9-7-15-7s-11 2-15 7z" fill={farbe} {...strich} />;
    case 1: // Seitenscheitel
      return <path d="M17 29c-1-12 7-18 16-18 9 0 15 7 14 17-6-1-12-4-15-9-3 5-9 8-15 10z" fill={farbe} {...strich} />;
    case 2: // lang (Pony)
      return <path d="M17 29c0-11 7-18 15-18s15 7 15 18c-5-3-11-4-15-4s-10 1-15 4z" fill={farbe} {...strich} />;
    case 3: // Locken
      return (
        <path
          d="M16 29c-3-3-2-8 2-9 0-5 5-8 9-6 3-4 9-4 11 0 4-2 9 1 9 6 4 1 5 6 2 9-3-3-6-3-8-1-3-3-8-3-10 0-3-3-8-3-10 0-2-2-4-2-5 1z"
          fill={farbe}
          {...strich}
        />
      );
    case 4: // Zopf (vorne wie Seitenscheitel)
      return <path d="M17 29c0-11 7-18 15-18s15 7 15 18c-6-2-11-6-14-10-3 4-9 8-16 10z" fill={farbe} {...strich} />;
    case 5: // Irokese
      return <path d="M27 21c0-6 2-13 5-15 3 2 5 9 5 15z" fill={farbe} {...strich} />;
    default: // 6: Glatze
      return null;
  }
}

function Augen({ art }) {
  switch (art) {
    case 1: // fröhlich
      return <path d="M22 31c1.5-2.5 4.5-2.5 6 0M36 31c1.5-2.5 4.5-2.5 6 0" fill="none" {...strich} />;
    case 2: // zwinkern
      return (
        <g>
          <circle cx="25" cy="31" r="2.4" fill={K} />
          <path d="M36 31h6" {...strich} />
        </g>
      );
    case 3: // groß
      return (
        <g>
          <circle cx="25" cy="31" r="4" fill="#fff" {...strich} strokeWidth="2" />
          <circle cx="39" cy="31" r="4" fill="#fff" {...strich} strokeWidth="2" />
          <circle cx="25.6" cy="31.4" r="1.8" fill={K} />
          <circle cx="39.6" cy="31.4" r="1.8" fill={K} />
        </g>
      );
    case 4: // müde
      return <path d="M22 31h6M36 31h6M22 29.5c2 .5 4 .5 6 0M36 29.5c2 .5 4 .5 6 0" fill="none" {...strich} strokeWidth="2" />;
    default:
      return (
        <g>
          <circle cx="25" cy="31" r="2.4" fill={K} />
          <circle cx="39" cy="31" r="2.4" fill={K} />
        </g>
      );
  }
}

function Mund({ art, pose }) {
  if (pose === 'jubel') return <path d="M25 38c2 6 12 6 14 0z" fill="#8c2f39" {...strich} strokeWidth="2" />;
  if (pose === 'oh') return <ellipse cx="32" cy="40" rx="3" ry="4" fill="#8c2f39" {...strich} strokeWidth="2" />;
  switch (art) {
    case 1: // Grinsen
      return <path d="M25 38c2 5 12 5 14 0z" fill="#fff" {...strich} strokeWidth="2" />;
    case 2: // staunen
      return <circle cx="32" cy="40" r="2.6" fill="#8c2f39" {...strich} strokeWidth="2" />;
    case 3: // frech (Zunge)
      return (
        <g>
          <path d="M26 38c3 3 9 3 12 0" fill="none" {...strich} />
          <path d="M31 39.5c0 3 4 3 4 0" fill="#ef7fae" {...strich} strokeWidth="1.6" />
        </g>
      );
    case 4: // ernst
      return <path d="M27 39h10" {...strich} />;
    default:
      return <path d="M26 38c3 3 9 3 12 0" fill="none" {...strich} />;
  }
}

function Extra({ art, haarfarbe }) {
  switch (art) {
    case 1: // Brille
      return (
        <g fill="none" {...strich} strokeWidth="2">
          <circle cx="25" cy="31" r="5" />
          <circle cx="39" cy="31" r="5" />
          <path d="M30 31h4M20 30l-3-1M44 30l3-1" />
        </g>
      );
    case 2: // Mütze
      return (
        <g>
          <path d="M15 25c0-10 8-16 17-16s17 6 17 16z" fill="#e9505a" {...strich} />
          <path d="M14 25h36" {...strich} strokeWidth="4" stroke="#f6f1e7" />
          <path d="M14 25h36" fill="none" {...strich} />
          <circle cx="32" cy="8" r="3.5" fill="#f6f1e7" {...strich} strokeWidth="2" />
        </g>
      );
    case 3: // Kappe
      return (
        <g>
          <path d="M16 24c0-9 7-14 16-14s16 5 16 14z" fill="#2f7fb5" {...strich} />
          <path d="M40 23c6 0 12 1 15 3-4 2-10 2-15 1z" fill="#2f7fb5" {...strich} />
        </g>
      );
    case 4: // Krone
      return <path d="M20 19l3-10 5 6 4-8 4 8 5-6 3 10z" fill="#f2b632" {...strich} />;
    case 5: // Kopfhörer
      return (
        <g>
          <path d="M14 32c0-14 8-21 18-21s18 7 18 21" fill="none" {...strich} strokeWidth="3" />
          <rect x="10" y="27" width="7" height="11" rx="3" fill={haarfarbe === '#1b1b1b' ? '#e9505a' : '#1b1b1b'} {...strich} strokeWidth="2" />
          <rect x="47" y="27" width="7" height="11" rx="3" fill={haarfarbe === '#1b1b1b' ? '#e9505a' : '#1b1b1b'} {...strich} strokeWidth="2" />
        </g>
      );
    case 6: // Bauhelm (auch für die Baustellen der Startseite)
      return (
        <g>
          <path d="M14 25c0-10 8-17 18-17s18 7 18 17z" fill="#f2b632" {...strich} />
          <path d="M28 9h8v16h-8z" fill="#f7c95a" {...strich} strokeWidth="2" />
          <path d="M11 25h42" fill="none" {...strich} strokeWidth="4.5" />
          <path d="M11 25h42" fill="none" stroke="#f2b632" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    default:
      return null;
  }
}

function Arme({ pose, haut, farbe }) {
  if (pose === 'jubel') {
    return (
      <g>
        <path d="M14 50 6 30M50 50l8-20" stroke={farbe} strokeWidth="7" strokeLinecap="round" />
        <path d="M14 50 6 30M50 50l8-20" fill="none" {...strich} strokeWidth="1.6" />
        <circle cx="6" cy="27" r="4" fill={haut} {...strich} strokeWidth="2" />
        <circle cx="58" cy="27" r="4" fill={haut} {...strich} strokeWidth="2" />
      </g>
    );
  }
  if (pose === 'daumen') {
    return (
      <g>
        <path d="M50 52l7-10" stroke={farbe} strokeWidth="7" strokeLinecap="round" />
        <rect x="53" y="33" width="8" height="8" rx="2.5" fill={haut} {...strich} strokeWidth="2" />
        <path d="M56 33v-6c0-2 3-2 3 0v6" fill={haut} {...strich} strokeWidth="2" />
      </g>
    );
  }
  if (pose === 'oh') {
    return (
      <g>
        <circle cx="13" cy="33" r="4" fill={haut} {...strich} strokeWidth="2" />
        <circle cx="51" cy="33" r="4" fill={haut} {...strich} strokeWidth="2" />
      </g>
    );
  }
  return null;
}

/**
 * wert: gespeicherter Text (siehe oben); groesse in px; pose wie oben.
 * Rein dekorativ (aria-hidden) – der Name steht daneben.
 */
export default function Avatar({ wert, groesse = 40, pose = 'normal', className = '' }) {
  const a = avatarLesen(wert);
  const haut = HAUT[a.haut];
  const haar = HAARFARBE[a.haarfarbe];
  const kleid = KLEIDFARBE[a.kleidfarbe];
  return (
    <svg className={`avatar-bild ${className}`} viewBox="0 0 64 64" width={groesse} height={groesse} aria-hidden="true">
      <FrisurHinten art={a.frisur} farbe={haar} />
      <Kleidung art={a.kleidung} farbe={kleid} />
      <Arme pose={pose} haut={haut} farbe={kleid} />
      <path d="M29 42h6v5h-6z" fill={haut} {...strich} strokeWidth="2" />
      <circle cx="17" cy="32" r="3" fill={haut} {...strich} strokeWidth="2" />
      <circle cx="47" cy="32" r="3" fill={haut} {...strich} strokeWidth="2" />
      <ellipse cx="32" cy="30" rx="15" ry="16" fill={haut} {...strich} />
      <FrisurVorne art={a.frisur} farbe={haar} />
      <Augen art={pose === 'jubel' ? 1 : a.augen} />
      <circle cx="21" cy="37" r="2.4" fill="#ef7fae" opacity=".55" />
      <circle cx="43" cy="37" r="2.4" fill="#ef7fae" opacity=".55" />
      <Mund art={a.mund} pose={pose} />
      <Extra art={a.extra} haarfarbe={haar} />
    </svg>
  );
}
