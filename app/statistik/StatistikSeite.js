'use client';
/**
 * app/statistik/StatistikSeite.js – Dashboard im Quizzle-Design (nur für Admins)
 *
 * Oben der Zeitraum (7 / 30 / 90 Tage), darunter:
 *  - Kennzahlen mit Vergleich zum gleich langen Zeitraum davor
 *  - Verlauf je Tag: Besuche und gespielte Quizze (zwei Diagramme, nie zwei Achsen in einem)
 *  - Weltkarte: Länder nach Besuchern bzw. nach gespielten Gebieten eingefärbt (eine Farbe,
 *    hell → dunkel), daneben die Ranglisten der Länder und Städte
 *  - Quizze: was gut läuft (oft gespielt), was abgebrochen wird, was schwer ist
 *  - Konten: Name, E-Mail, seit, zuletzt aktiv, Ort; Klick zeigt die letzten Quizze
 *  - Geräte, Sprachen, Herkunft, Seiten
 * Daten: Supabase-Funktionen statistik(tage), konten_liste(), konto_quizze(konto).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useKonto } from '@/lib/konto';
import { useT } from '@/lib/sprache';
import { dauer } from '@/components/Bestenliste';
import Avatar from '@/components/Avatar';

const ZEITRAEUME = [7, 30, 90];
const STUFEN = 5; // Farbstufen der Weltkarte

// ---------------------------------------------------------------------------------------
// Kleine Bausteine
// ---------------------------------------------------------------------------------------

function Veraenderung({ jetzt, vorher, tage }) {
  const t = useT();
  if (vorher == null || jetzt == null) return null;
  let text;
  if (!vorher && !jetzt) text = t('wie davor');
  else if (!vorher) text = t('neu – davor nichts');
  else {
    const p = Math.round((100 * (jetzt - vorher)) / vorher);
    text = p === 0 ? t('wie davor') : `${p > 0 ? '+' : '−'}${Math.abs(p)} %`;
  }
  const richtung = jetzt > vorher ? 'hoch' : jetzt < vorher ? 'runter' : 'gleich';
  return (
    <span className={`kz-veraenderung ${richtung}`}>
      {richtung !== 'gleich' && (
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d={richtung === 'hoch' ? 'M6 2l4 5H2z' : 'M6 10L2 5h8z'} />
        </svg>
      )}
      {text}
      <small>{t('zu den {n} Tagen davor', { n: tage })}</small>
    </span>
  );
}

function Kennzahl({ titel, wert, zusatz, vorher, tage }) {
  return (
    <div className="kennzahl karte">
      <span className="kz-titel">{titel}</span>
      <strong className="kz-wert">{wert}</strong>
      {zusatz && <span className="kz-zusatz">{zusatz}</span>}
      {vorher !== undefined && <Veraenderung jetzt={typeof wert === 'number' ? wert : null} vorher={vorher} tage={tage} />}
    </div>
  );
}

/** Säulen je Tag mit Hinweis beim Darüberfahren (eine Reihe, ein Maßstab) */
function Verlauf({ titel, punkte, feld, einheit }) {
  const t = useT();
  const [zeige, setZeige] = useState(null);
  const B = 640;
  const H = 170;
  const unten = 24;
  const oben = 10;
  const max = Math.max(1, ...punkte.map((p) => p[feld]));
  const stufe = Math.pow(10, Math.floor(Math.log10(max)));
  const schritt = [1, 2, 5, 10].map((f) => f * stufe).find((s) => max / s <= 4) ?? stufe * 10;
  const linien = [];
  for (let w = schritt; w <= max; w += schritt) linien.push(w);
  const yAus = (w) => H - unten - ((H - unten - oben) * w) / max;
  const breite = B / punkte.length;
  const balken = Math.max(2, Math.min(22, breite - 2));
  const datum = (tag, lang = false) =>
    new Date(`${tag}T12:00:00`).toLocaleDateString(t.sprache, lang ? { weekday: 'short', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'numeric' });
  const summe = punkte.reduce((n, p) => n + p[feld], 0);
  return (
    <figure className="verlauf karte">
      <figcaption>
        <span>{titel}</span>
        <strong>{t.zahl(summe)}</strong>
      </figcaption>
      <div className="verlauf-flaeche">
        <svg viewBox={`0 0 ${B} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${titel}: ${t.zahl(summe)}`}>
          {linien.map((w) => (
            <g key={w}>
              <line x1="0" x2={B} y1={yAus(w)} y2={yAus(w)} className="v-gitter" />
            </g>
          ))}
          <line x1="0" x2={B} y1={H - unten} y2={H - unten} className="v-basis" />
          {punkte.map((p, i) => {
            const h = (H - unten) - yAus(p[feld]);
            const x = i * breite + (breite - balken) / 2;
            return (
              <g key={p.tag}>
                {p[feld] > 0 && (
                  <path
                    className={`v-balken${zeige === i ? ' aktiv' : ''}`}
                    d={`M${x},${H - unten}V${H - unten - h + Math.min(4, h)}q0,-${Math.min(4, h)} ${Math.min(4, balken / 2)},-${Math.min(4, h)}H${x + balken - Math.min(4, balken / 2)}q${Math.min(4, balken / 2)},0 ${Math.min(4, balken / 2)},${Math.min(4, h)}V${H - unten}z`}
                  />
                )}
                <rect x={i * breite} y="0" width={breite} height={H} className="v-treffer" onPointerEnter={() => setZeige(i)} onPointerLeave={() => setZeige(null)} />
              </g>
            );
          })}
        </svg>
        <div className="v-achse" aria-hidden="true">
          {linien.map((w) => (
            <span key={w} style={{ bottom: `${(100 * (H - yAus(w))) / H}%` }}>
              {t.zahl(w)}
            </span>
          ))}
        </div>
        {zeige !== null && (
          <div className="v-tipp" style={{ left: `${(100 * (zeige + 0.5)) / punkte.length}%` }}>
            <span>{datum(punkte[zeige].tag, true)}</span>
            <strong>
              {t.zahl(punkte[zeige][feld])} {einheit}
            </strong>
          </div>
        )}
      </div>
      <div className="v-daten" aria-hidden="true">
        <span>{punkte.length ? datum(punkte[0].tag) : ''}</span>
        <span>{punkte.length ? datum(punkte[punkte.length - 1].tag) : ''}</span>
      </div>
    </figure>
  );
}

/** Rangliste mit waagerechten Balken */
function Rangliste({ titel, eintraege, leer, name = (e) => e.name, zeichen }) {
  const t = useT();
  const max = Math.max(1, ...eintraege.map((e) => e.anzahl));
  return (
    <section className="rangliste karte">
      <h2>{titel}</h2>
      {!eintraege.length ? (
        <p className="hinweis">{leer ?? t('Noch keine Daten')}</p>
      ) : (
        <ol>
          {eintraege.map((e, i) => (
            <li key={`${name(e)}-${i}`}>
              <span className="rl-name">
                {zeichen?.(e)}
                {name(e)}
              </span>
              <span className="rl-zahl">{t.zahl(e.anzahl)}</span>
              <span className="rl-balken" style={{ '--anteil': `${(100 * e.anzahl) / max}%` }} aria-hidden="true" />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const Flagge = ({ land }) =>
  land ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="mini-flagge" src={`/flaggen/${land.toLowerCase()}.svg`} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
  ) : null;

/**
 * Wer ist angemeldet? Je Zeile ein Balken (100 %) aus „mit Konto“ (Akzentfarbe) und „als Gast“
 * (zurückhaltend), Prozente als Text daneben – die Farbe trägt nie allein die Bedeutung.
 */
function KontoAnteil({ zeilen }) {
  const t = useT();
  const fehlt = zeilen.every((z) => z.konto == null);
  return (
    <section className="konto-anteil karte">
      <h2>{t('Mit Konto oder als Gast')}</h2>
      {fehlt ? (
        <p className="hinweis">{t('Dafür bitte supabase/schema.sql noch einmal ausführen.')}</p>
      ) : (
        <>
          <div className="ka-legende" aria-hidden="true">
            <span>
              <i className="ka-konto" />
              {t('mit Konto')}
            </span>
            <span>
              <i className="ka-gast" />
              {t('als Gast')}
            </span>
          </div>
          {zeilen.map((z) => {
            const anteil = z.gesamt ? Math.round((100 * z.konto) / z.gesamt) : 0;
            return (
              <div key={z.titel} className="ka-zeile">
                <div className="ka-kopf">
                  <span>{z.titel}</span>
                  <strong>{z.gesamt ? `${anteil} %` : '–'}</strong>
                </div>
                <div className="ka-balken" role="img" aria-label={t('{p} % mit Konto, {q} % als Gast', { p: anteil, q: 100 - anteil })}>
                  {z.gesamt > 0 && anteil > 0 && <span className="ka-konto" style={{ flexGrow: anteil }} />}
                  {z.gesamt > 0 && anteil < 100 && <span className="ka-gast" style={{ flexGrow: 100 - anteil }} />}
                </div>
                <small>{t('{n} von {m} mit Konto', { n: t.zahl(z.konto), m: t.zahl(z.gesamt) })}</small>
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------------------
// Weltkarte
// ---------------------------------------------------------------------------------------

function Weltkarte({ karte, werte, modus, onModus }) {
  const t = useT();
  const [zeige, setZeige] = useState(null);
  const max = Math.max(0, ...Object.values(werte));
  // Logarithmische Stufen von 1 bis max: ein Land mit sehr vielen Besuchen überstrahlt sonst
  // alle anderen (bei kleinen Zahlen: so viele Stufen wie Werte)
  const stufen = Math.max(1, Math.min(STUFEN, max));
  const stufeVon = (w) => (!w ? null : max <= 1 ? 0 : Math.min(stufen - 1, Math.floor((Math.log(w) / Math.log(max)) * stufen)));
  // Von–bis je Stufe genau so, wie stufeVon zuordnet
  const grenzen = [];
  for (let w = 1; w <= Math.min(max, 1e6); w += 1) {
    const i = stufeVon(w);
    grenzen[i] = grenzen[i] ? [grenzen[i][0], w] : [w, w];
  }
  const name = (land) => t.ortsname(karte.laender.find((l) => l.id === land) ?? { name: land, en: land });
  return (
    <section className="statistik-karte karte">
      <div className="sk-kopf">
        <h2>{modus === 'besuche' ? t('Woher die Besucher kommen') : t('Wo gespielt wird')}</h2>
        <div className="segment-schalter" role="radiogroup" aria-label={t('Karte')}>
          {[
            ['besuche', t('Besucher')],
            ['quizze', t('Gespielte Gebiete')],
          ].map(([w, text]) => (
            <button key={w} type="button" role="radio" aria-checked={modus === w} className={modus === w ? 'gewaehlt' : undefined} onClick={() => onModus(w)}>
              {text}
            </button>
          ))}
        </div>
      </div>
      <div className="sk-flaeche">
        <svg viewBox={`0 0 ${karte.breite} ${karte.hoehe}`} role="img" aria-label={t('Weltkarte')}>
          <rect width={karte.breite} height={karte.hoehe} className="sk-wasser" />
          {karte.laender.map((l) => {
            const s = stufeVon(werte[l.id]);
            return (
              <path
                key={l.id}
                d={l.d}
                className={`sk-land${s === null ? ' leer' : ` s-${Math.round((s * (STUFEN - 1)) / Math.max(1, stufen - 1))}`}${zeige === l.id ? ' aktiv' : ''}`}
                onPointerEnter={() => setZeige(l.id)}
                onPointerLeave={() => setZeige(null)}
              />
            );
          })}
        </svg>
        {zeige && (
          <div className="sk-tipp">
            <Flagge land={zeige} />
            <span>{name(zeige)}</span>
            <strong>{t.zahl(werte[zeige] ?? 0)}</strong>
          </div>
        )}
      </div>
      <div className="sk-legende" aria-label={t('Legende')}>
        <span className="sk-feld leer" />
        <span>{t('keine')}</span>
        {grenzen.map(([a, b], i) => grenzen[i] && (
          <span key={i} className="sk-stufe">
            <span className={`sk-feld s-${Math.round((i * (STUFEN - 1)) / Math.max(1, stufen - 1))}`} />
            {a >= b ? t.zahl(b) : `${t.zahl(a)}–${t.zahl(b)}`}
          </span>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------
// Quizze und Konten
// ---------------------------------------------------------------------------------------

function QuizTabelle({ quizze, gebiete }) {
  const t = useT();
  const gebietName = (id) => (gebiete[id] ? t.ortsname(gebiete[id]) : id ?? '');
  const quizName = (q) => q.titel ?? q.quiz;
  const abschluss = (q) => (q.allein ? Math.min(100, Math.round((100 * q.enden) / q.allein)) : null);
  const max = Math.max(1, ...quizze.map((q) => q.starts));
  const genug = quizze.filter((q) => q.allein >= 3);
  const mitQuote = quizze.filter((q) => q.enden >= 3 && q.quote != null);
  const hervor = [
    quizze[0] && { art: 'beliebt', titel: t('Am beliebtesten'), q: quizze[0], wert: t('{n}× gestartet', { n: quizze[0].starts }) },
    genug.length > 1 && (() => {
      const q = [...genug].sort((a, b) => abschluss(a) - abschluss(b))[0];
      return { art: 'abbruch', titel: t('Wird oft abgebrochen'), q, wert: t('{p} % beendet', { p: abschluss(q) }) };
    })(),
    mitQuote.length > 1 && (() => {
      const q = [...mitQuote].sort((a, b) => a.quote - b.quote)[0];
      return { art: 'schwer', titel: t('Am schwersten'), q, wert: t('Ø {p} %', { p: q.quote }) };
    })(),
    mitQuote.length > 1 && (() => {
      const q = [...mitQuote].sort((a, b) => b.quote - a.quote)[0];
      return { art: 'leicht', titel: t('Am leichtesten'), q, wert: t('Ø {p} %', { p: q.quote }) };
    })(),
  ].filter(Boolean);

  return (
    <section className="quiz-statistik karte">
      <h2>{t('Quizze')}</h2>
      {!quizze.length ? (
        <p className="hinweis">{t('Noch keine Daten')}</p>
      ) : (
        <>
          <div className="qs-hervor">
            {hervor.map((h) => (
              <div key={h.art} className={`qs-karte ${h.art}`}>
                <span>{h.titel}</span>
                <strong>{quizName(h.q)}</strong>
                <small>
                  {gebietName(h.q.gebiet)} · {h.wert}
                </small>
              </div>
            ))}
          </div>
          <div className="tabelle-huelle">
            <table className="stat-tabelle">
              <thead>
                <tr>
                  <th>{t('Quiz')}</th>
                  <th className="zahl">{t('Gestartet')}</th>
                  <th className="zahl">{t('Beendet')}</th>
                  <th className="zahl">{t('Ø Ergebnis')}</th>
                  <th className="zahl">{t('Ø Dauer')}</th>
                </tr>
              </thead>
              <tbody>
                {quizze.map((q) => (
                  <tr key={q.quiz}>
                    <td>
                      <strong>{quizName(q)}</strong>
                      <small>{gebietName(q.gebiet)}</small>
                    </td>
                    <td className="zahl mit-balken">
                      <span className="tb-balken" style={{ '--anteil': q.starts / max }} aria-hidden="true" />
                      {t.zahl(q.starts)}
                    </td>
                    <td className="zahl">{abschluss(q) == null ? '–' : `${abschluss(q)} %`}</td>
                    <td className="zahl">{q.quote == null ? '–' : `${q.quote} %`}</td>
                    <td className="zahl">{q.sekunden == null ? '–' : dauer(q.sekunden)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function KontoZeile({ k, laender, gebiete }) {
  const t = useT();
  const [auf, setAuf] = useState(false);
  const [quizze, setQuizze] = useState(null);
  const ort = k.ort && [k.ort.stadt, laender[k.ort.land] ? t.ortsname(laender[k.ort.land]) : k.ort.land].filter(Boolean).join(', ');
  const datum = (wert) => (wert ? new Date(wert).toLocaleDateString(t.sprache, { day: 'numeric', month: 'short', year: 'numeric' }) : '–');
  const zeit = (wert) =>
    wert ? new Date(wert).toLocaleString(t.sprache, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–';

  async function umschalten() {
    setAuf((a) => !a);
    if (quizze) return;
    const { data } = await supabase().rpc('konto_quizze', { konto: k.id });
    setQuizze((data ?? []).filter((e) => e.art === 'quiz_ende'));
  }

  return (
    <>
      <tr className={`konto-zeile${auf ? ' auf' : ''}`} onClick={umschalten}>
        <td>
          <button type="button" className="kz-name" aria-expanded={auf} onClick={(e) => (e.stopPropagation(), umschalten())}>
            {k.avatar ? <Avatar wert={k.avatar} groesse={32} /> : <span className="avatar-platz" />}
            <span>
              <strong>{k.name ?? '–'}</strong>
              {k.admin && <em className="admin-marke">{t('Admin')}</em>}
            </span>
          </button>
        </td>
        <td className="email">
          {k.email}
          {!k.bestaetigt && <small>{t('nicht bestätigt')}</small>}
        </td>
        <td>{datum(k.erstellt)}</td>
        <td>{zeit(k.zuletzt)}</td>
        <td>
          {k.ort && <Flagge land={k.ort.land} />} {ort || '–'}
        </td>
        <td className="zahl">{t.zahl(k.quizze)}</td>
        <td className="zahl">{k.quote == null ? '–' : `${k.quote} %`}</td>
      </tr>
      {auf && (
        <tr className="konto-details">
          <td colSpan={7}>
            {!quizze ? (
              <span className="hinweis">…</span>
            ) : !quizze.length ? (
              <span className="hinweis">{t('Noch keine Quizze beendet')}</span>
            ) : (
              <ul>
                {quizze.map((q, i) => (
                  <li key={i}>
                    <span>{zeit(q.erstellt_am)}</span>
                    <strong>{q.titel ?? q.quiz}</strong>
                    <span>{gebiete[q.gebiet] ? t.ortsname(gebiete[q.gebiet]) : ''}</span>
                    <span className="zahl">{q.quote == null ? '' : `${q.quote} %`}</span>
                    <span className="zahl">{q.sekunden ? dauer(q.sekunden) : ''}</span>
                    {q.party && <em>{t('Party')}</em>}
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function KontenTabelle({ konten, laender, gebiete }) {
  const t = useT();
  const [suche, setSuche] = useState('');
  const liste = konten.filter((k) => `${k.name ?? ''} ${k.email}`.toLowerCase().includes(suche.trim().toLowerCase()));
  return (
    <section className="konten-statistik karte">
      <div className="sk-kopf">
        <h2>
          {t('Konten')} <small>{t.zahl(konten.length)}</small>
        </h2>
        <label className="ql-suche klein">
          <input type="search" value={suche} onChange={(e) => setSuche(e.target.value)} placeholder={t('Suchen')} aria-label={t('Suchen')} />
        </label>
      </div>
      {!konten.length ? (
        <p className="hinweis">{t('Noch keine Konten')}</p>
      ) : (
        <div className="tabelle-huelle">
          <table className="stat-tabelle konten">
            <thead>
              <tr>
                <th>{t('Name')}</th>
                <th>{t('E-Mail')}</th>
                <th>{t('Seit')}</th>
                <th>{t('Zuletzt aktiv')}</th>
                <th>{t('Ort')}</th>
                <th className="zahl">{t('Quizze')}</th>
                <th className="zahl">{t('Ø Ergebnis')}</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((k) => (
                <KontoZeile key={k.id} k={k} laender={laender} gebiete={gebiete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------------------

export default function StatistikSeite({ karte }) {
  const t = useT();
  const konto = useKonto();
  const [tage, setTage] = useState(30);
  const [daten, setDaten] = useState(null);
  const [konten, setKonten] = useState([]);
  const [zustand, setZustand] = useState('laedt'); // laedt | ok | kein-zugriff | fehler
  const [kartenModus, setKartenModus] = useState('besuche');
  const laender = useMemo(() => Object.fromEntries(karte.laender.map((l) => [l.id, l])), [karte.laender]);

  const laden = useCallback(async () => {
    const db = supabase();
    if (!db || !konto.nutzer) return;
    setZustand((z) => (z === 'ok' ? 'ok' : 'laedt'));
    const [s, k] = await Promise.all([db.rpc('statistik', { tage }), db.rpc('konten_liste')]);
    if (s.error || k.error) {
      const fehler = s.error ?? k.error;
      setZustand(fehler.code === '42501' || /zugriff/i.test(fehler.message) ? 'kein-zugriff' : 'fehler');
      return;
    }
    setDaten(s.data);
    setKonten(k.data ?? []);
    setZustand('ok');
  }, [konto.nutzer, tage]);

  useEffect(() => {
    laden();
  }, [laden]);

  // Werte für die Weltkarte: Besucher je Land bzw. gestartete Quizze je Land (Bundesländer → DE)
  const kartenWerte = useMemo(() => {
    if (!daten) return {};
    if (kartenModus === 'besuche') return Object.fromEntries(daten.laender.filter((l) => l.besuche).map((l) => [l.land, l.besuche]));
    const werte = {};
    for (const { gebiet, anzahl } of daten.gebiete) {
      const g = karte.gebiete[gebiet];
      const land = g?.ebene === 'land' ? gebiet : g?.ebene === 'region' ? g.land : null;
      if (land) werte[land] = (werte[land] ?? 0) + anzahl;
    }
    return werte;
  }, [daten, kartenModus, karte.gebiete]);

  if (!konto.bereit) return <div className="statistik" aria-busy="true" />;
  if (!konto.verfuegbar || !konto.nutzer || zustand === 'kein-zugriff') {
    return (
      <div className="statistik">
        <h1>{t('Statistik')}</h1>
        <p className="hinweis">{!konto.nutzer ? t('Bitte als Admin anmelden.') : t('Kein Zugriff – nur für Admins.')}</p>
      </div>
    );
  }

  const kz = daten?.kennzahlen ?? {};
  const k = daten?.konten ?? {};
  const kontinente = (daten?.gebiete ?? []).filter((g) => ['welt', 'kontinent'].includes(karte.gebiete[g.gebiet]?.ebene));
  const geraetName = { handy: t('Handy'), tablet: t('Tablet'), computer: t('Computer') };
  const spracheName = { de: 'Deutsch', en: 'English' };

  return (
    <div className="statistik">
      <header className="statistik-kopf">
        <h1>{t('Statistik')}</h1>
        <div className="segment-schalter" role="radiogroup" aria-label={t('Zeitraum')}>
          {ZEITRAEUME.map((n) => (
            <button key={n} type="button" role="radio" aria-checked={tage === n} className={tage === n ? 'gewaehlt' : undefined} onClick={() => setTage(n)}>
              {t('{n} Tage', { n })}
            </button>
          ))}
        </div>
        <button type="button" className="knopf knopf-zweit" onClick={laden}>
          {t('Neu laden')}
        </button>
      </header>

      {zustand === 'fehler' && (
        <p className="fehler" role="alert">
          {t('Die Statistik konnte nicht geladen werden. Ist das SQL aus supabase/schema.sql ausgeführt?')}
        </p>
      )}
      {!daten ? (
        <div className="statistik-laedt" aria-busy="true" />
      ) : (
        <>
          <div className="kennzahlen">
            <Kennzahl titel={t('Besuche')} wert={kz.besuche} vorher={kz.besuche_vorher} tage={daten.tage} zusatz={t('aus {n} Ländern', { n: kz.laender })} />
            <Kennzahl titel={t('Gespielte Quizze')} wert={kz.quiz_start} vorher={kz.quiz_start_vorher} tage={daten.tage} />
            <Kennzahl
              titel={t('Zu Ende gespielt')}
              wert={kz.quiz_allein ? `${Math.min(100, Math.round((100 * kz.quiz_ende) / kz.quiz_allein))} %` : '–'}
              zusatz={t('{n} von {m} allein gestarteten', { n: kz.quiz_ende, m: kz.quiz_allein })}
            />
            <Kennzahl titel={t('Ø Ergebnis')} wert={kz.quote == null ? '–' : `${kz.quote} %`} zusatz={kz.quote_vorher == null ? null : t('davor {p} %', { p: kz.quote_vorher })} />
            <Kennzahl titel={t('Konten')} wert={k.gesamt} zusatz={t('{n} neu im Zeitraum', { n: k.neu })} />
            <Kennzahl titel={t('Angemeldet aktiv')} wert={k.aktiv} zusatz={t('{n} Anmeldungen', { n: kz.anmeldungen })} vorher={undefined} />
            <Kennzahl
              titel={t('Mit Konto gespielt')}
              wert={kz.quiz_konto == null ? '–' : kz.quiz_start ? `${Math.round((100 * kz.quiz_konto) / kz.quiz_start)} %` : '–'}
              zusatz={kz.spieler_konto == null ? null : t('{n} Spieler mit Konto', { n: kz.spieler_konto })}
            />
            <Kennzahl titel={t('Party-Spiele')} wert={kz.party} vorher={kz.party_vorher} tage={daten.tage} zusatz={t('{n} Lobbys erstellt', { n: kz.lobbys })} />
          </div>

          <div className="verlaeufe">
            <Verlauf titel={t('Besuche je Tag')} punkte={daten.verlauf} feld="besuche" einheit={t('Besuche')} />
            <Verlauf titel={t('Gespielte Quizze je Tag')} punkte={daten.verlauf} feld="quizze" einheit={t('Quizze')} />
          </div>

          <KontoAnteil
            zeilen={[
              { titel: t('Besuche'), konto: kz.besuche_konto, gesamt: kz.besuche },
              { titel: t('Gespielte Quizze'), konto: kz.quiz_konto, gesamt: kz.quiz_start },
            ]}
          />

          <div className="karten-reihe">
            <Weltkarte karte={karte} werte={kartenWerte} modus={kartenModus} onModus={setKartenModus} />
            <div className="karten-listen">
              {kartenModus === 'besuche' ? (
                <>
                  <Rangliste
                    titel={t('Länder')}
                    eintraege={daten.laender.filter((l) => l.besuche).slice(0, 8).map((l) => ({ ...l, anzahl: l.besuche }))}
                    name={(e) => (laender[e.land] ? t.ortsname(laender[e.land]) : e.land)}
                    zeichen={(e) => <Flagge land={e.land} />}
                  />
                  <Rangliste
                    titel={t('Städte')}
                    eintraege={daten.staedte.slice(0, 8).map((s) => ({ ...s, anzahl: s.besuche }))}
                    name={(e) => e.stadt}
                    zeichen={(e) => <Flagge land={e.land} />}
                  />
                </>
              ) : (
                <>
                  <Rangliste
                    titel={t('Länder und Bundesländer')}
                    eintraege={daten.gebiete.filter((g) => ['land', 'region'].includes(karte.gebiete[g.gebiet]?.ebene)).slice(0, 8)}
                    name={(e) => (karte.gebiete[e.gebiet] ? t.ortsname(karte.gebiete[e.gebiet]) : e.gebiet)}
                  />
                  <Rangliste titel={t('Welt und Kontinente')} eintraege={kontinente.slice(0, 7)} name={(e) => t.ortsname(karte.gebiete[e.gebiet])} />
                </>
              )}
            </div>
          </div>

          <QuizTabelle quizze={daten.quizze} gebiete={karte.gebiete} />

          <KontenTabelle konten={konten} laender={laender} gebiete={karte.gebiete} />

          <div className="ranglisten">
            <Rangliste titel={t('Geräte')} eintraege={daten.geraete} name={(e) => geraetName[e.name] ?? e.name} />
            <Rangliste titel={t('Sprache')} eintraege={daten.sprachen} name={(e) => spracheName[e.name] ?? e.name} />
            <Rangliste titel={t('Herkunft')} eintraege={daten.herkunft} leer={t('Alle kamen direkt')} />
            <Rangliste titel={t('Seiten')} eintraege={daten.seiten} />
          </div>
        </>
      )}
    </div>
  );
}
