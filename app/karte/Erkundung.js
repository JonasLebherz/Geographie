'use client';
/**
 * app/karte/Erkundung.js – Karten-Erkundung: Welt → Kontinent → Land → Region
 *
 * Links die Bühne mit der Karte, rechts die Leiste mit dem, was man im aktuellen Gebiet
 * spielen kann (sortiert nach Sinn) und wohin man weiter hineinkommt.
 *
 * Wechsel zwischen Gebieten ohne Neuladen, mit **Kamerafahrt** wie in Instandhaltung
 * (kamerafahrt() unten): Vor dem ersten Zeichnen wird gemessen, wo die angeklickte Fläche in
 * der übergeordneten Ebene liegt (A) und wie groß die Karte der Unterebene ist (B). Beide Ebenen
 * bewegen sich gemeinsam wie ein Globus-Flug – erst schwenkt die Kamera die Fläche in die Mitte,
 * dann taucht sie senkrecht hinein (Maßstab logarithmisch). Beim Hineinzoomen öffnet sich die
 * neue Ebene mit weichem, rundem Rand; die alte blendet aus. Dazu ein leises „Wusch“.
 * Web-Animationen statt CSS-Klassen, damit ein Neuzeichnen durch React die Fahrt nicht abbricht.
 *
 * Die Adresse wandert mit (/karte/europa/deutschland), der Zurück-Knopf des Browsers fliegt
 * wieder hinaus. Daten der Gebiete: /karte-daten/<kennung>/gebiet.json (beim Bauen erzeugt).
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import KarteEbene from '@/components/karte/KarteEbene';
import { useQuizRunde, VERSUCHE } from '@/components/karte/useQuizRunde';
import Bestenliste, { dauer } from '@/components/Bestenliste';
import TonSchalter from '@/components/TonSchalter';
import { Chevron } from '@/components/Symbole';
import { useT } from '@/lib/sprache';
import { klang } from '@/lib/ton';
import { bestwerteLesen } from '@/lib/bestwerte';

const FAHRT_DAUER = 1000; // ms
const weich = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const stufe01 = (x, von, bis) => Math.min(1, Math.max(0, (x - von) / (bis - von)));
const ruhig = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
/** Auf dem Handy liegt die Leiste unter der Karte: nach einer Wahl dort wieder nach oben zur Karte */
const nachOben = () => {
  if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: ruhig() ? 'auto' : 'smooth' });
};

/**
 * Bilder einer Kamerafahrt (aus Instandhaltung übernommen).
 * A = angeklickte Fläche in der Elternebene, B = Karte der Kindebene (Mitte x/y, Breite w, Höhe h).
 * kind/eltern: Transformationen beider Ebenen; huelle/gegen: weicher runder Rand beim Hineinzoomen
 * (Hülle mit fester Maske wächst gegen Ende, die Ebene darin schrumpft gegengleich – nur Transform,
 * keine animierte Maskengröße, die jedes Bild neu zeichnen müsste).
 */
function kamerafahrt(A, B, rein, schritte = 32) {
  const s = Math.min(A.w / B.w, A.h / B.h);
  const kind = [];
  const eltern = [];
  const huelle = [];
  const gegen = [];
  for (let i = 0; i <= schritte; i += 1) {
    const zeit = i / schritte;
    const p = rein ? zeit : 1 - zeit;
    const schwenk = weich(stufe01(p, 0, 0.4)); // Fläche wandert in die Mitte
    const zoom = weich(stufe01(p, 0.18, 1)); // danach senkrecht hinein
    const k = s ** (1 - zoom);
    const cx = A.x + (B.x - A.x) * schwenk;
    const cy = A.y + (B.y - A.y) * schwenk;
    kind.push({ offset: zeit, transform: `translate(${cx - k * B.x}px, ${cy - k * B.y}px) scale(${k})` });
    eltern.push({ offset: zeit, transform: `translate(${cx - (k / s) * A.x}px, ${cy - (k / s) * A.y}px) scale(${k / s})` });
    const m = 1 + 4 * stufe01(zeit, 0.55, 1) ** 2;
    huelle.push({ offset: zeit, transform: `translate(${cx - k * m * B.x}px, ${cy - k * m * B.y}px) scale(${k * m})` });
    gegen.push({ offset: zeit, transform: `translate(${B.x * (1 - 1 / m)}px, ${B.y * (1 - 1 / m)}px) scale(${1 / m})` });
  }
  return { kind, eltern, huelle, gegen };
}

/** Adresse eines Gebiets: /karte/europa/deutschland */
const adresseVon = (daten) => `/karte${daten.ahnen.slice(1).map((a) => `/${a.slug}`).join('')}`;

export default function Erkundung({ start }) {
  const t = useT();
  const [gebiet, setGebiet] = useState(start);
  const [uebergang, setUebergang] = useState(null); // { von: Gebietsdaten, richtung: 'rein' | 'raus' | 'blende' }
  const [quiz, setQuiz] = useState(null); // { satz, daten, nr }
  const [laedt, setLaedt] = useState(null);
  const [hervor, setHervor] = useState(null);
  const [bestwerte, setBestwerte] = useState({});
  const zwischenspeicher = useRef(new Map([[start.knoten.id, start]]));
  const buehneRef = useRef(null);
  const altRef = useRef(null);
  const neuRef = useRef(null);
  const gebietRef = useRef(gebiet);
  gebietRef.current = gebiet;

  useEffect(() => {
    setBestwerte(bestwerteLesen());
  }, [quiz]);

  const json = useCallback(async (pfad) => {
    const antwort = await fetch(pfad);
    if (!antwort.ok) throw new Error(`${pfad}: ${antwort.status}`);
    return antwort.json();
  }, []);

  /** Gebietsdaten laden (gemerkt) */
  const laden = useCallback(
    (id) => {
      const speicher = zwischenspeicher.current;
      if (!speicher.has(id)) {
        const versprechen = json(`/karte-daten/${id}/gebiet.json`).catch((fehler) => {
          speicher.delete(id);
          throw fehler;
        });
        speicher.set(id, versprechen);
      }
      return Promise.resolve(speicher.get(id));
    },
    [json],
  );
  const vorladen = useCallback((id) => laden(id).catch(() => {}), [laden]);

  /** Zu einem anderen Gebiet wechseln – mit Kamerafahrt, wenn es darüber oder darunter liegt */
  const wechseln = useCallback(
    async (zielId, { verlauf = true } = {}) => {
      const aktuell = gebietRef.current;
      if (zielId === aktuell.knoten.id) {
        setQuiz(null);
        return;
      }
      setLaedt(zielId);
      let neu;
      try {
        neu = await laden(zielId);
      } catch {
        setLaedt(null);
        return;
      }
      setLaedt(null);
      if (verlauf) window.history.pushState(null, '', adresseVon(neu));
      const rein = neu.ahnen.some((a) => a.id === aktuell.knoten.id);
      const raus = aktuell.ahnen.some((a) => a.id === neu.knoten.id);
      const richtung = rein ? 'rein' : raus ? 'raus' : 'blende';
      setQuiz(null);
      setHervor(null);
      nachOben();
      if (!ruhig()) {
        if (richtung !== 'blende') klang(richtung);
        setUebergang({ von: aktuell, richtung });
      }
      setGebiet(neu);
    },
    [laden],
  );

  // Zurück-/Vor-Knopf des Browsers: Gebiet zur Adresse suchen und hinfliegen
  useEffect(() => {
    async function zurueck() {
      const teile = window.location.pathname.replace(/^\/karte\/?/, '').split('/').filter(Boolean);
      let id = 'welt';
      for (const teil of teile) {
        const daten = await laden(id);
        const kind = daten.kinder.find((k) => k.slug === teil);
        if (!kind) break;
        id = kind.id;
      }
      wechseln(id, { verlauf: false });
    }
    window.addEventListener('popstate', zurueck);
    return () => window.removeEventListener('popstate', zurueck);
  }, [laden, wechseln]);

  // Kamerafahrt (siehe kamerafahrt oben)
  useLayoutEffect(() => {
    const neu = neuRef.current;
    const alt = altRef.current;
    const buehne = buehneRef.current;
    if (!uebergang || !neu || !alt || !buehne) return undefined;
    const animationen = [];
    const blende = (el, ein, d) =>
      el.animate(
        Array.from({ length: 11 }, (_, i) => ({
          offset: i / 10,
          opacity: ein ? stufe01(i / 10, 0.3, 0.65) : 1 - stufe01(i / 10, 0.45, 0.8),
        })),
        { duration: d, fill: 'both' },
      );

    if (uebergang.richtung === 'blende') {
      animationen.push(neu.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, fill: 'both' }));
      animationen.push(alt.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: 'both' }));
    } else {
      const rein = uebergang.richtung === 'rein';
      const [elternEbene, kindEbene] = rein ? [alt, neu] : [neu, alt];
      const [elternDaten, kindDaten] = rein ? [uebergang.von, gebiet] : [gebiet, uebergang.von];
      // Fläche in der Elternebene: das Untergebiet auf dem Weg zum Kind (auch über mehrere Stufen)
      const stufe = kindDaten.ahnen.findIndex((a) => a.id === elternDaten.knoten.id);
      const fokusId = kindDaten.ahnen[stufe + 1]?.id ?? kindDaten.knoten.id;
      const fokus = elternEbene.querySelector(`[data-id="${fokusId}"]`);
      const b = buehne.getBoundingClientRect();
      const A = fokus && (() => {
        const r = fokus.getBoundingClientRect();
        return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2, w: r.width, h: r.height };
      })();
      // Karte der Kindebene: Das SVG zeigt sie eingepasst („meet“) mittig in der Bühne
      const { breite, hoehe } = kindDaten.karte;
      const massstab = Math.min(b.width / breite, b.height / hoehe);
      const B = { x: b.width / 2, y: b.height / 2, w: breite * massstab, h: hoehe * massstab };

      if (A && A.w > 0 && A.h > 0) {
        const fahrt = kamerafahrt(A, B, rein);
        const huelle = rein ? kindEbene.parentElement : null;
        if (huelle) {
          const maske = `radial-gradient(closest-side at ${B.x}px ${B.y}px, #000 62%, transparent 100%)`;
          huelle.style.maskImage = maske;
          huelle.style.webkitMaskImage = maske;
          huelle.style.transformOrigin = '0 0';
          animationen.push(huelle.animate(fahrt.huelle, { duration: FAHRT_DAUER, fill: 'both' }));
          animationen.push(kindEbene.animate(fahrt.gegen, { duration: FAHRT_DAUER, fill: 'both' }));
          animationen.push({ cancel: () => { huelle.style.maskImage = ''; huelle.style.webkitMaskImage = ''; } });
        } else {
          animationen.push(kindEbene.animate(fahrt.kind, { duration: FAHRT_DAUER, fill: 'both' }));
        }
        animationen.push(elternEbene.animate(fahrt.eltern, { duration: FAHRT_DAUER, fill: 'both' }));
      }
      animationen.push(blende(neu, true, FAHRT_DAUER), blende(alt, false, FAHRT_DAUER));
    }
    neu.style.transformOrigin = '0 0';
    alt.style.transformOrigin = '0 0';
    const ende = setTimeout(() => setUebergang(null), uebergang.richtung === 'blende' ? 450 : FAHRT_DAUER);
    return () => {
      clearTimeout(ende);
      animationen.forEach((a) => a.cancel());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uebergang]);

  /** Quiz starten: Spieldaten laden (oder die Flächen der Gebietskarte nehmen) */
  const quizStarten = useCallback(
    async (satz) => {
      setLaedt(satz.id);
      try {
        const daten = satz.wieKarte
          ? { art: 'flaeche', einheiten: gebietRef.current.flaechen.map(({ ziel, ...f }) => f) }
          : await json(`/karte-daten/${gebietRef.current.knoten.id}/${satz.id}.json`);
        setQuiz({ satz, daten, nr: Date.now() });
        nachOben();
      } finally {
        setLaedt(null);
      }
    },
    [json],
  );

  // Direkt mit einem Quiz starten (?quiz=laender, z. B. von alten Adressen /kontinente/europa)
  useEffect(() => {
    const wunsch = new URLSearchParams(window.location.search).get('quiz');
    const satz = wunsch && start.saetze.find((s) => s.id === wunsch);
    if (satz) {
      window.history.replaceState(null, '', adresseVon(start));
      quizStarten(satz);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flaecheGewaehlt(id) {
    const flaeche = gebiet.flaechen.find((f) => f.id === id);
    if (flaeche?.ziel) wechseln(flaeche.ziel);
  }

  const ebenen = uebergang
    ? [
        { daten: uebergang.von, rolle: 'alt' },
        { daten: gebiet, rolle: 'neu' },
      ]
    : [{ daten: gebiet, rolle: 'neu' }];

  if (quiz && !uebergang) {
    return (
      <div className="erkundung im-quiz">
        <QuizAnsicht
          key={quiz.nr}
          gebiet={gebiet}
          quiz={quiz}
          onEnde={() => setQuiz(null)}
          onNochmal={() => setQuiz({ ...quiz, nr: Date.now() })}
        />
      </div>
    );
  }

  return (
    <div className="erkundung">
      <div className="buehne" ref={buehneRef}>
        {ebenen.map(({ daten, rolle }) => (
          <div key={daten.knoten.id} className={`ebene-huelle huelle-${rolle}`}>
            <div className="ebene" ref={rolle === 'alt' ? altRef : neuRef}>
              <KarteEbene
                daten={daten}
                aktiv={!uebergang && rolle === 'neu'}
                hervor={rolle === 'neu' ? hervor : null}
                onWahl={flaecheGewaehlt}
                onVorschau={vorladen}
              />
            </div>
          </div>
        ))}
        {laedt && <div className="buehne-laedt" aria-hidden="true" />}
      </div>

      <Leiste
        gebiet={gebiet}
        bestwerte={bestwerte}
        laedt={laedt}
        onGebiet={wechseln}
        onQuiz={quizStarten}
        onHervor={setHervor}
        onVorschau={vorladen}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Rechte Leiste: Pfad, Gebiet, Quizze, Untergebiete
// ---------------------------------------------------------------------------------------

function Leiste({ gebiet, bestwerte, laedt, onGebiet, onQuiz, onHervor, onVorschau }) {
  const t = useT();
  const leisteRef = useRef(null);
  // Neues Gebiet: Leiste wieder von oben zeigen
  useEffect(() => {
    leisteRef.current?.scrollTo({ top: 0 });
  }, [gebiet.knoten.id]);
  const { knoten, ahnen, kinder, saetze } = gebiet;
  const fakten = saetze.slice(0, 2).map((s) => `${t.zahl(s.anzahl)} ${t.ortsname({ name: s.titel, en: s.titelEn })}`);
  const kinderTitel = { welt: t('Kontinente'), kontinent: t('Länder') }[knoten.ebene]
    ?? (saetze[0] ? t.ortsname({ name: saetze[0].titel, en: saetze[0].titelEn }) : '');

  return (
    <aside className="leiste" aria-label={t('Auswahl')} ref={leisteRef}>
      <nav className="pfad" aria-label={t('Pfad')}>
        {ahnen.map((a, i) =>
          i < ahnen.length - 1 ? (
            <span key={a.id}>
              <button type="button" onClick={() => onGebiet(a.id)}>
                {t.ortsname(a)}
              </button>
              <Chevron className="pfad-trenner" />
            </span>
          ) : null,
        )}
      </nav>
      <h1 className="leiste-titel" key={knoten.id}>
        {t.ortsname(knoten)}
      </h1>
      <p className="leiste-fakten">{fakten.join(' · ')}</p>

      {saetze.length > 0 && (
        <section className="leiste-abschnitt">
          <h2>{t('Quizze')}</h2>
          <ul className="liste karte">
            {saetze.map((s) => {
              const bestwert = bestwerte[s.bestenliste];
              return (
                <li key={s.id}>
                  <button type="button" className={`listen-zeile${laedt === s.id ? ' laedt' : ''}`} onClick={() => onQuiz(s)}>
                    <span className="titel">{t.ortsname({ name: s.titel, en: s.titelEn })}</span>
                    <span className="zusatz">
                      {s.runde < s.anzahl ? t('{r} von {n}', { r: s.runde, n: t.zahl(s.anzahl) }) : t.zahl(s.anzahl)}
                      {bestwert && <small>{t('Bestwert {q} %', { q: bestwert.quote })}</small>}
                    </span>
                    <Chevron />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {kinder.length > 0 && (
        <section className="leiste-abschnitt">
          <h2>{kinderTitel}</h2>
          <ul className="liste karte">
            {kinder.map((k) => (
              <li key={k.id}>
                <button
                  type="button"
                  className={`listen-zeile kompakt${laedt === k.id ? ' laedt' : ''}`}
                  onClick={() => onGebiet(k.id)}
                  onMouseEnter={() => {
                    onHervor(k.id);
                    onVorschau(k.id);
                  }}
                  onMouseLeave={() => onHervor(null)}
                  onFocus={() => onVorschau(k.id)}
                >
                  <span className="titel">{t.ortsname(k)}</span>
                  <Chevron />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------------------
// Quiz: Karte mit der Frage als schwebender Glas-Kapsel, rechts Stand bzw. Ergebnis
// ---------------------------------------------------------------------------------------

function QuizAnsicht({ gebiet, quiz, onEnde, onNochmal }) {
  const t = useT();
  const { satz, daten } = quiz;
  const runde = useQuizRunde({ einheiten: daten.einheiten, runde: satz.runde, bestenliste: satz.bestenliste });
  const { spiel, fertig, zahlen, anzahl } = runde;
  const titel = t.ortsname({ name: satz.titel, en: satz.titelEn });
  const namenZeigen = useCallback((id) => fertig || Boolean(runde.ergebnis[id]), [fertig, runde.ergebnis]);
  const erledigt = zahlen.gruen + zahlen.gelb + zahlen.rot;
  const anteil = (n) => `${(100 * n) / (anzahl || 1)}%`;

  // Esc beendet das Quiz (zurück zur Karte)
  useEffect(() => {
    const taste = (e) => e.key === 'Escape' && !document.querySelector('.profil-menue') && onEnde();
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, [onEnde]);

  return (
    <>
      <div className="buehne">
        <div className="ebene-huelle huelle-neu">
          <div className="ebene">
            <KarteEbene
              daten={gebiet}
              quiz={daten}
              zustand={runde.ergebnis}
              effekt={runde.effekt}
              offen={Boolean(spiel) && !fertig && !spiel.sperre}
              namenZeigen={namenZeigen}
              onWahl={runde.klick}
            />
          </div>
        </div>

        {!fertig && (
          <div className="frage-kapsel" aria-live="polite">
            <p className="frage-name" key={runde.ziel ?? 'leer'}>
              {runde.zielName ?? '\u00a0'}
            </p>
            <div className="frage-unter">
              <span className="versuche" aria-label={t('{n} von {m} Versuchen übrig', { n: VERSUCHE - (spiel?.fehl ?? 0), m: VERSUCHE })}>
                {Array.from({ length: VERSUCHE }, (_, i) => (
                  <i key={i} className={i < (spiel?.fehl ?? 0) ? 'verbraucht' : undefined} />
                ))}
              </span>
              {runde.rueckmeldung && (
                <span key={runde.rueckmeldung.schluessel} className={`rueckmeldung ${runde.rueckmeldung.art}`}>
                  {runde.rueckmeldung.text}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <aside className="leiste" aria-label={titel}>
        <nav className="pfad">
          <button type="button" onClick={onEnde}>
            <Chevron richtung="links" className="pfad-zurueck" />
            {t.ortsname(gebiet.knoten)}
          </button>
        </nav>
        <h1 className="leiste-titel">{titel}</h1>
        <div className="quiz-stand">
          <span className="stand">
            <strong>{Math.min(erledigt + (fertig ? 0 : 1), anzahl || 1)}</strong> / {anzahl || '–'}
          </span>
          <TonSchalter />
        </div>
        <div className="fortschritt" aria-hidden="true">
          <span className="f-gruen" style={{ width: anteil(zahlen.gruen) }} />
          <span className="f-gelb" style={{ width: anteil(zahlen.gelb) }} />
          <span className="f-rot" style={{ width: anteil(zahlen.rot) }} />
        </div>

        {fertig ? (
          <QuizErgebnis satz={satz} runde={runde} onNochmal={onNochmal} onEnde={onEnde} />
        ) : (
          <ul className="bilanz klein">
            <li>
              <span className="farbpunkt gruen" /> <b>{zahlen.gruen}</b> {t('beim ersten Versuch')}
            </li>
            <li>
              <span className="farbpunkt gelb" /> <b>{zahlen.gelb}</b> {t('beim zweiten oder dritten Versuch')}
            </li>
            <li>
              <span className="farbpunkt rot" /> <b>{zahlen.rot}</b> {t('aufgedeckt')}
            </li>
          </ul>
        )}
      </aside>
    </>
  );
}

function QuizErgebnis({ satz, runde, onNochmal, onEnde }) {
  const t = useT();
  const { zahlen, quote, sekunden, spiel, namen } = runde;
  const aufgedeckt = spiel.reihenfolge.filter((id) => spiel.ergebnis[id] === 'rot').map((id) => namen.get(id));
  aufgedeckt.sort((a, b) => a.localeCompare(b, t.sprache));

  return (
    <div className="quiz-ergebnis erscheinen">
      <p className="eyebrow">{t('Ergebnis')}</p>
      <p className="ergebnis-zahl">
        {quote}
        <small>%</small>
      </p>
      <p className="zeit">{dauer(sekunden)} min</p>
      <ul className="bilanz">
        <li>
          <span className="farbpunkt gruen" /> <b>{zahlen.gruen}</b> {t('beim ersten Versuch')}
        </li>
        <li>
          <span className="farbpunkt gelb" /> <b>{zahlen.gelb}</b> {t('beim zweiten oder dritten Versuch')}
        </li>
        <li>
          <span className="farbpunkt rot" /> <b>{zahlen.rot}</b> {t('aufgedeckt')}
        </li>
      </ul>
      <div className="ergebnis-knoepfe">
        <button type="button" className="knopf knopf-haupt" onClick={onNochmal}>
          {t('Noch einmal')}
        </button>
        <button type="button" className="knopf knopf-zweit" onClick={onEnde}>
          {t('Zur Karte')}
        </button>
      </div>
      {aufgedeckt.length > 0 && (
        <p className="verpasst">
          {t('Aufgedeckt')}: <strong>{aufgedeckt.join(', ')}</strong>
        </p>
      )}
      <div className="karte leiste-bestenliste">
        <Bestenliste
          quiz={satz.bestenliste}
          punkte={quote}
          fragen={100}
          sekunden={sekunden}
          wertText={(e) => `${e.punkte} %`}
        />
      </div>
    </div>
  );
}
