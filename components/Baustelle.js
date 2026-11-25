/**
 * components/Baustelle.js – kleine Comic-Baustelle für die Kacheln „Kommt bald“ der Startseite
 *
 * Figuren aus dem Avatar-Baukasten (alle mit Bauhelm) und Requisiten als feine Zeichnung mit
 * dicker Kontur: Leitkegel, Absperrbake, Schaufel, Schubkarre, Leiter, Farbrolle.
 * Drei Szenen (art 0–2). Rein dekorativ (aria-hidden).
 */
import Avatar from './Avatar';

const K = '#1b1b1b';
const linie = { stroke: K, strokeWidth: 2.4, strokeLinejoin: 'round', strokeLinecap: 'round' };

/** Figuren je Szene: Avatar-Text (Haut.Frisur.Haarfarbe.Augen.Mund.Kleidung.Farbe.Extra=6 Bauhelm), Lage, Pose */
const SZENEN = [
  {
    figuren: [
      { wert: '1.0.1.0.0.3.3.6', x: 20, pose: 'daumen', klasse: 'wippt' },
      { wert: '4.3.0.2.1.0.1.6', x: 58, pose: 'normal', klasse: 'schaufelt' },
    ],
  },
  {
    figuren: [
      { wert: '2.2.3.1.0.1.2.6', x: 16, pose: 'normal', klasse: 'schiebt' },
      { wert: '0.4.4.0.2.2.0.6', x: 60, pose: 'oh', klasse: 'wippt' },
    ],
  },
  {
    figuren: [
      { wert: '3.1.2.3.0.3.5.6', x: 24, pose: 'normal', klasse: 'streicht' },
      { wert: '5.6.0.0.1.0.4.6', x: 62, pose: 'jubel', klasse: 'wippt' },
    ],
  },
];

/** Requisiten je Szene (Koordinaten 0–200 × 0–120, Boden bei y = 108) */
function Requisiten({ art }) {
  const kegel = (x) => (
    <g key={`k${x}`}>
      <path d={`M${x - 9} 108l7-30h4l7 30z`} fill="#f08a3c" {...linie} />
      <path d={`M${x - 6} 96h12`} stroke="#f6f1e7" strokeWidth="4" />
      <path d={`M${x - 13} 108h26`} {...linie} />
    </g>
  );
  const bake = (x) => (
    <g key={`b${x}`}>
      <path d={`M${x} 108V80M${x + 46} 108V80`} {...linie} />
      <rect x={x - 4} y="70" width="54" height="14" rx="2" fill="#f2b632" {...linie} />
      <path d={`M${x + 6} 70l-8 14M${x + 18} 70l-8 14M${x + 30} 70l-8 14M${x + 42} 70l-8 14`} stroke={K} strokeWidth="4" />
      <rect x={x - 4} y="70" width="54" height="14" rx="2" fill="none" {...linie} />
    </g>
  );
  if (art === 0) {
    return (
      <>
        {bake(6)}
        {/* Schaufel im Sandhaufen */}
        <path d="M150 108c4-14 14-20 24-20s18 8 22 20z" fill="#e3b77a" {...linie} />
        <path d="M168 60l-10 34" {...linie} strokeWidth="3" />
        <path d="M152 92l12 4-4 12-12-3z" fill="#9a9aa3" {...linie} />
        {kegel(186)}
      </>
    );
  }
  if (art === 1) {
    return (
      <>
        {/* Schubkarre mit Erde */}
        <path d="M96 84h50l-10 18h-34z" fill="#2f7fb5" {...linie} />
        <path d="M100 84c6-8 30-10 42 0" fill="#8c5a34" {...linie} />
        <circle cx="120" cy="104" r="5" fill="#f6f1e7" {...linie} />
        <path d="M96 84l-18-6M102 102l-6 6" {...linie} />
        {kegel(170)}
        {kegel(188)}
      </>
    );
  }
  return (
    <>
      {/* Leiter mit Farbeimer, frisch gestrichene Wand */}
      <rect x="132" y="28" width="62" height="80" fill="#f6f1e7" {...linie} />
      <path d="M134 30h58v30h-58z" fill="#ef7fae" opacity=".55" />
      <path d="M118 108l14-80M150 108l-4-80" {...linie} />
      <path d="M121 92h27M124 76h23M127 60h20M130 44h17" {...linie} strokeWidth="2" />
      <path d="M160 108v-12h16v12z" fill="#ef7fae" {...linie} />
      {bake(8)}
    </>
  );
}

export default function Baustelle({ art = 0 }) {
  const szene = SZENEN[art % SZENEN.length];
  return (
    <div className={`baustelle szene-${art}`} aria-hidden="true">
      <svg className="baustelle-buehne" viewBox="0 0 200 120" preserveAspectRatio="xMidYMax meet">
        <path d="M0 108h200" {...linie} />
        <Requisiten art={art % SZENEN.length} />
      </svg>
      {szene.figuren.map((f) => (
        <span key={f.wert} className={`baustelle-figur ${f.klasse}`} style={{ left: `${f.x}%` }}>
          <Avatar wert={f.wert} groesse={64} pose={f.pose} />
        </span>
      ))}
    </div>
  );
}
