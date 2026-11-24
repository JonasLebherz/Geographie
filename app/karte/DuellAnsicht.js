'use client';
/**
 * app/karte/DuellAnsicht.js – Quiz im Party-Modus (1 gegen 1)
 *
 * Beide Spieler bekommen dieselben Fragen in derselben Reihenfolge (vom Gastgeber gemischt).
 * Jede Frage hat wie im Solo-Spiel drei Versuche. Wer eine Frage erledigt hat (Treffer oder
 * dreimal daneben), wartet; der andere hat ab dann noch 10 Sekunden – danach zählt die Frage
 * für ihn als nicht gefunden. Sind beide fertig, geht es für beide gleichzeitig weiter.
 *
 * Punkte je Frage: grün (1. Versuch) 3, gelb (2./3. Versuch) 1, rot 0 – dazu 1 Bonuspunkt für
 * den schnelleren richtigen Treffer. Wer schneller war, entscheidet der Gastgeber als
 * Schiedsrichter (welche Antwort bei ihm zuerst ankam) und schickt es als „bonus“ – sonst
 * könnten beide Geräte mit ihren eigenen Uhren zu verschiedenen Ergebnissen kommen.
 * Hat nur einer richtig, bekommt er den Bonus ohne Schiedsspruch. Verlässt der Gegner die
 * Lobby, wird nicht mehr auf ihn gewartet.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import KarteEbene from '@/components/karte/KarteEbene';
import Frage, { JokerKnopf, WeissNicht } from '@/components/karte/Frage';
import { useQuizRunde, VERSUCHE } from '@/components/karte/useQuizRunde';
import TonSchalter from '@/components/TonSchalter';
import { Chevron, Flamme } from '@/components/Symbole';
import { useT } from '@/lib/sprache';

export const DUELL_FRAGEN = 10;
const RESTZEIT = 10000; // ms für den, der noch sucht
const PAUSE = 1600; // ms zwischen zwei Fragen (Aufdecken ansehen)

const WERT = { gruen: 3, gelb: 1, rot: 0 };

const richtig = (a) => Boolean(a) && a.farbe !== 'rot';

/** Punktestand: { ich, gegner }. bonus: nummer → 'ich' | 'gegner' (Schiedsspruch des Gastgebers) */
function punkte(antworten, bonus) {
  let ich = 0;
  let gegner = 0;
  for (const [nummer, a] of Object.entries(antworten)) {
    ich += WERT[a.ich?.farbe] ?? 0;
    gegner += WERT[a.gegner?.farbe] ?? 0;
    if (richtig(a.ich) && richtig(a.gegner)) {
      if (bonus[nummer] === 'ich') ich += 1;
      else if (bonus[nummer] === 'gegner') gegner += 1;
    } else if (richtig(a.ich) && a.gegner) ich += 1;
    else if (richtig(a.gegner) && a.ich) gegner += 1;
  }
  return { ich, gegner };
}

export default function DuellAnsicht({ gebiet, quiz, party, onLobby, onRevanche }) {
  const t = useT();
  const { satz, daten, reihenfolge, nr } = quiz;
  const [antworten, setAntworten] = useState({}); // nummer → { ich: { farbe, ankunft }, gegner: { … } }
  const [bonus, setBonus] = useState({}); // nummer → 'ich' | 'gegner'
  const host = party.rolle === 'host';
  const frageStart = useRef(Date.now());

  const onFrageFertig = useCallback(
    ({ nummer, farbe }) => {
      const zeit = Date.now() - frageStart.current;
      setAntworten((a) => ({ ...a, [nummer]: { ...a[nummer], ich: { farbe, zeit, ankunft: Date.now() } } }));
      party.senden('antwort', { nr, nummer, farbe, zeit });
    },
    [party, nr],
  );

  const runde = useQuizRunde({
    einheiten: daten.einheiten,
    runde: reihenfolge.length,
    bestenliste: satz.bestenliste,
    reihenfolge,
    gesteuert: true,
    onFrageFertig,
    joker: quiz.joker ?? 3,
  });
  const { spiel, fertig, naechste, zeitUm } = runde;
  const einheiten = useMemo(() => new Map(daten.einheiten.map((e) => [e.id, e])), [daten.einheiten]);
  const zielHatBild = Boolean(runde.ziel && einheiten.get(runde.ziel)?.bild);
  const nummer = spiel?.nummer ?? 0;
  const aktuell = antworten[nummer] ?? {};
  const gegnerDa = Boolean(party.gegner);

  // Antworten des Gegners
  useEffect(
    () =>
      party.abonnieren((n) => {
        if (n.nr !== nr) return;
        if (n.typ === 'antwort') {
          setAntworten((a) => ({ ...a, [n.nummer]: { ...a[n.nummer], gegner: { farbe: n.farbe, zeit: n.zeit, ankunft: Date.now() } } }));
        } else if (n.typ === 'bonus') {
          // Schiedsspruch des Gastgebers – aus seiner Sicht „ich“, aus unserer also umgekehrt
          setBonus((b) => ({ ...b, [n.nummer]: n.an === 'gastgeber' ? 'gegner' : 'ich' }));
        }
      }),
    [party, nr],
  );

  // Gastgeber: Haben beide richtig, entscheidet die Ankunft bei ihm, wer schneller war
  useEffect(() => {
    if (!host) return;
    for (const [nummer, a] of Object.entries(antworten)) {
      if (bonus[nummer] || !richtig(a.ich) || !richtig(a.gegner)) continue;
      const erster = a.ich.ankunft <= a.gegner.ankunft ? 'ich' : 'gegner';
      setBonus((b) => ({ ...b, [nummer]: erster }));
      party.senden('bonus', { nr, nummer: Number(nummer), an: erster === 'ich' ? 'gastgeber' : 'gast' });
    }
  }, [host, antworten, bonus, party, nr]);

  // Neue Frage: Uhr neu
  useEffect(() => {
    frageStart.current = Date.now();
  }, [nummer]);

  // Gegner ist fertig, ich nicht: 10 Sekunden Restzeit. Die Frist gehört fest zu ihrer Frage –
  // sonst liefe beim Wechsel die alte Frist für die neue Frage weiter.
  const [fristen, setFristen] = useState({}); // nummer → Zeitpunkt
  const frist = fristen[nummer] ?? null;
  useEffect(() => {
    if (!fertig && aktuell.gegner && !aktuell.ich && !frist) setFristen((f) => ({ ...f, [nummer]: Date.now() + RESTZEIT }));
  }, [fertig, aktuell.gegner, aktuell.ich, frist, nummer]);
  useEffect(() => {
    if (!frist || aktuell.ich || fertig) return undefined;
    const uhr = setTimeout(zeitUm, Math.max(0, frist - Date.now()));
    return () => clearTimeout(uhr);
  }, [frist, aktuell.ich, fertig, zeitUm]);
  const [jetzt, setJetzt] = useState(Date.now());
  useEffect(() => {
    if (!frist || aktuell.ich) return undefined;
    const takt = setInterval(() => setJetzt(Date.now()), 200);
    return () => clearInterval(takt);
  }, [frist, aktuell.ich]);
  const rest = frist && !aktuell.ich && !fertig ? Math.max(0, Math.ceil((frist - jetzt) / 1000)) : null;

  // Beide fertig (oder Gegner weg): kurz zeigen, dann für beide weiter
  useEffect(() => {
    if (fertig || !aktuell.ich || (gegnerDa && !aktuell.gegner)) return undefined;
    const uhr = setTimeout(naechste, PAUSE);
    return () => clearTimeout(uhr);
  }, [fertig, aktuell.ich, aktuell.gegner, gegnerDa, naechste]);

  const stand = punkte(antworten, bonus);
  const gegnerName = party.gegner?.name ?? t('Gegner');
  const titel = t.ortsname({ name: satz.titel, en: satz.titelEn });
  const namenZeigen = useCallback((id) => fertig || Boolean(runde.ergebnis[id]), [fertig, runde.ergebnis]);
  const status = (a) => (!a ? 'sucht' : a.farbe === 'rot' ? 'rot' : a.farbe);

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
          <div className={`frage-kapsel${runde.impuls ? ` impuls-${runde.impuls.art}` : ''}`} key={runde.impuls?.n ?? 0} aria-live="polite">
            {runde.serie >= 2 && (
              <span className="serie">
                <Flamme />
                {runde.serie}
              </span>
            )}
            <Frage satz={satz} einheit={runde.ziel ? einheiten.get(runde.ziel) : null} joker={runde.jokerAktiv} />
            <div className="frage-unter">
              <span className="versuche">
                {Array.from({ length: VERSUCHE }, (_, i) => (
                  <i key={i} className={i < (spiel?.fehl ?? 0) ? 'verbraucht' : undefined} />
                ))}
              </span>
              {rest !== null ? (
                <span className="rueckmeldung frist">{t('noch {s} s', { s: rest })}</span>
              ) : aktuell.ich && gegnerDa && !aktuell.gegner ? (
                <span className="rueckmeldung info">{t('Warte auf {name} …', { name: gegnerName })}</span>
              ) : runde.rueckmeldung ? (
                <span key={runde.rueckmeldung.schluessel} className={`rueckmeldung ${runde.rueckmeldung.art}`}>
                  {runde.rueckmeldung.text}
                </span>
              ) : (
                !aktuell.ich && (
                  <>
                    {zielHatBild && !runde.jokerAktiv && satz.bilder !== 'frage' && runde.jokerRest > 0 && (
                      <JokerKnopf rest={runde.jokerRest} onKlick={runde.jokerZiehen} gesperrt={Boolean(spiel?.sperre)} />
                    )}
                    <WeissNicht onKlick={runde.ueberspringen} gesperrt={Boolean(spiel?.sperre)} />
                  </>
                )
              )}
            </div>
            {rest !== null && <span className="frist-balken" style={{ '--dauer': `${RESTZEIT}ms` }} key={`frist-${nummer}`} />}
          </div>
        )}
      </div>

      <aside className="leiste" aria-label={titel}>
        <nav className="pfad">
          <button type="button" onClick={onLobby}>
            <Chevron richtung="links" className="pfad-zurueck" />
            {t('Lobby')}
          </button>
        </nav>
        <h1 className="leiste-titel">{titel}</h1>
        <p className="leiste-fakten">
          {t.ortsname(gebiet.knoten)} · {t('Frage {n} von {m}', { n: Math.min(nummer + 1, reihenfolge.length), m: reihenfolge.length })}
        </p>

        <ol className="duell-stand">
          {[
            { name: party.ich.name, wert: stand.ich, a: aktuell.ich, ich: true },
            { name: gegnerName, wert: stand.gegner, a: aktuell.gegner, ich: false },
          ].map((s) => (
            <li key={s.ich ? 'ich' : 'gegner'} className={s.ich ? 'ich' : undefined}>
              <span className="duell-name">
                {s.name}
                {s.ich && <small>{t('du')}</small>}
              </span>
              {!fertig && <span className={`duell-status ${status(s.a)}`} aria-label={t(status(s.a) === 'sucht' ? 'sucht' : 'fertig')} />}
              <strong className="duell-punkte">{s.wert}</strong>
            </li>
          ))}
        </ol>
        <div className="quiz-stand">
          <span className="leise">{t('Grün 3 · Gelb 1 · Schnellster +1')}</span>
          <TonSchalter />
        </div>

        {fertig && (
          <div className="quiz-ergebnis erscheinen">
            <p className={`duell-sieger ${stand.ich > stand.gegner ? 'sieg' : stand.ich < stand.gegner ? 'niederlage' : 'gleich'}`}>
              {stand.ich > stand.gegner ? t('Gewonnen!') : stand.ich < stand.gegner ? t('Verloren') : t('Unentschieden')}
            </p>
            <p className="ergebnis-zahl duell-ergebnis">
              {stand.ich}
              <small> : {stand.gegner}</small>
            </p>
            <div className="ergebnis-knoepfe">
              {onRevanche && (
                <button type="button" className="knopf knopf-haupt" onClick={onRevanche}>
                  {t('Revanche')}
                </button>
              )}
              <button type="button" className="knopf knopf-zweit" onClick={onLobby}>
                {onRevanche ? t('Anderes Quiz') : t('Zur Karte')}
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
