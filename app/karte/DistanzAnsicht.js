'use client';
/**
 * app/karte/DistanzAnsicht.js – Quiz „Am nächsten dran“ (Rekorde, Gipfel, Essen, Geburtsorte)
 *
 * Wie die anderen Quizze: Frage als Glas-Kapsel über der Karte, rechts Stand bzw. Ergebnis.
 * Geantwortet wird mit einem Klick irgendwohin; danach zeigt die Karte Linie, Ziel und
 * Entfernung (siehe components/karte/useDistanzRunde.js).
 */
import { useEffect } from 'react';
import KarteEbene from '@/components/karte/KarteEbene';
import Frage, { WeissNicht } from '@/components/karte/Frage';
import { HOECHST, useDistanzRunde } from '@/components/karte/useDistanzRunde';
import { sterneFuer } from '@/components/karte/useQuizRunde';
import Bestenliste, { dauer } from '@/components/Bestenliste';
import TonSchalter from '@/components/TonSchalter';
import { Chevron, Stern } from '@/components/Symbole';
import { useT } from '@/lib/sprache';

/** Entfernung lesbar: 3,4 km bzw. 1.240 km */
export function km(t, wert) {
  if (wert === null) return t('Übersprungen');
  if (wert < 0.5) return t('Volltreffer');
  return `${wert < 10 ? wert.toLocaleString(t.sprache, { maximumFractionDigits: 1 }) : t.zahl(Math.round(wert))} km`;
}

export default function DistanzAnsicht({ gebiet, quiz, onEnde, onNochmal }) {
  const t = useT();
  const { satz, daten } = quiz;
  const runde = useDistanzRunde({
    einheiten: daten.einheiten,
    runde: satz.runde,
    skala: daten.skala,
    projektionen: gebiet.karte.projektionen,
    bestenliste: satz.bestenliste,
  });
  const { spiel, fertig, zahlen, anzahl, ziel, letzte, antworten } = runde;
  const titel = t.ortsname({ name: satz.titel, en: satz.titelEn });
  const erledigt = Object.keys(antworten).length;
  const anteil = (n) => `${(100 * n) / (anzahl || 1)}%`;
  const loesung = (e) => t.ortsname({ name: e.loesung, en: e.loesungEn });

  useEffect(() => {
    const taste = (e) => e.key === 'Escape' && !document.querySelector('.profil-menue') && onEnde();
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, [onEnde]);

  // Marken: während der Runde die gerade beantwortete Frage, am Ende alle Ziele
  const nachId = new Map(daten.einheiten.map((e) => [e.id, e]));
  const marken = fertig
    ? spiel.reihenfolge.map((id) => ({ id, ziel: nachId.get(id).punkt, klick: antworten[id]?.klick, farbe: antworten[id]?.farbe, text: t.ortsname(nachId.get(id)) }))
    : letzte && ziel
      ? [{ id: ziel.id, ziel: ziel.punkt, klick: letzte.klick, farbe: letzte.farbe, text: letzte.km === null ? loesung(ziel) : `${loesung(ziel)} · ${km(t, letzte.km)}` }]
      : [];

  return (
    <>
      <div className="buehne">
        <div className="ebene-huelle huelle-neu">
          <div className="ebene">
            <KarteEbene daten={gebiet} quiz={daten} offen={Boolean(spiel) && !fertig} onPunkt={runde.klick} marken={marken} />
          </div>
        </div>

        {!fertig && (
          <div className={`frage-kapsel${letzte ? ` impuls-${letzte.farbe === 'rot' ? 'falsch' : 'richtig'}` : ''}`} aria-live="polite">
            <Frage satz={satz} einheit={ziel} />
            <div className="frage-unter">
              {letzte ? (
                <span className={`rueckmeldung distanz ${letzte.farbe}`}>
                  {km(t, letzte.km)} · {t('{n} Punkte', { n: letzte.punkte })}
                </span>
              ) : (
                <span className="frage-hinweis">{satz.id === 'rekorde' ? t.ortsname(gebiet.knoten) : ' '}</span>
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
            <strong>{Math.min(erledigt + (fertig || runde.zeigt ? 0 : 1), anzahl || 1)}</strong> / {anzahl || '–'}
          </span>
          <TonSchalter />
        </div>
        <div className="fortschritt" aria-hidden="true">
          <span className="f-gruen" style={{ width: anteil(zahlen.gruen) }} />
          <span className="f-gelb" style={{ width: anteil(zahlen.gelb) }} />
          <span className="f-rot" style={{ width: anteil(zahlen.rot) }} />
        </div>

        {fertig ? (
          <DistanzErgebnis satz={satz} runde={runde} nachId={nachId} onNochmal={onNochmal} onEnde={onEnde} />
        ) : (
          <>
            <p className="distanz-summe">
              <strong>{t.zahl(runde.summe)}</strong> {t('von {n} Punkten', { n: t.zahl(HOECHST * anzahl) })}
            </p>
            <Antworten spiel={spiel} antworten={antworten} nachId={nachId} />
          </>
        )}
      </aside>
    </>
  );
}

/** Liste der bisherigen Antworten: Frage, Lösung, Entfernung */
function Antworten({ spiel, antworten, nachId }) {
  const t = useT();
  const ids = (spiel?.reihenfolge ?? []).filter((id) => antworten[id]);
  if (!ids.length) return null;
  return (
    <ul className="distanz-liste karte">
      {ids.map((id) => {
        const e = nachId.get(id);
        const a = antworten[id];
        return (
          <li key={id}>
            <span className={`farbpunkt ${a.farbe}`} />
            <span className="titel">
              {t.ortsname(e)}
              <small>{t.ortsname({ name: e.loesung, en: e.loesungEn })}</small>
            </span>
            <span className="zusatz">{km(t, a.km)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function DistanzErgebnis({ satz, runde, nachId, onNochmal, onEnde }) {
  const t = useT();
  const { quote, sekunden, summe, anzahl, spiel, antworten } = runde;
  const sterne = sterneFuer(quote);
  return (
    <div className="quiz-ergebnis erscheinen">
      <div className="sterne" aria-label={t('{n} von 3 Sternen', { n: sterne })}>
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= sterne ? 'stern voll' : 'stern'} style={{ '--i': n }}>
            <Stern voll={n <= sterne} />
          </span>
        ))}
      </div>
      <p className="ergebnis-zahl">
        {quote}
        <small>%</small>
      </p>
      <p className="zeit">
        {t('{n} von {m} Punkten', { n: t.zahl(summe), m: t.zahl(HOECHST * anzahl) })} · {dauer(sekunden)} min
      </p>
      <div className="ergebnis-knoepfe">
        <button type="button" className="knopf knopf-haupt" onClick={onNochmal}>
          {t('Noch einmal')}
        </button>
        <button type="button" className="knopf knopf-zweit" onClick={onEnde}>
          {t('Zur Karte')}
        </button>
      </div>
      <Antworten spiel={spiel} antworten={antworten} nachId={nachId} />
      <div className="karte leiste-bestenliste">
        <Bestenliste quiz={satz.bestenliste} punkte={quote} fragen={100} sekunden={sekunden} wertText={(e) => `${e.punkte} %`} />
      </div>
    </div>
  );
}
