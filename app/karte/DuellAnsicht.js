'use client';
/**
 * app/karte/DuellAnsicht.js – Quiz im Party-Modus (2 bis 8 Spieler, auf Wunsch in Teams)
 *
 * Alle bekommen dieselben Fragen in derselben Reihenfolge (vom Gastgeber gemischt). Jede Frage
 * hat wie im Solo-Spiel drei Versuche, „Weiß ich nicht“ und – je nach Regel – Joker. Wer eine
 * Frage erledigt hat, wartet; sobald der Erste fertig ist, haben die anderen noch die Bedenkzeit
 * (Regel `zeit`, Standard 10 s) – danach zählt die Frage für sie als nicht gefunden. Sind alle
 * Anwesenden fertig, geht es nach 1,6 s für alle gemeinsam weiter.
 *
 * Punkte je Frage: grün 3, gelb 1, rot 0 – dazu 1 Bonuspunkt für den schnellsten richtigen
 * Treffer. Wer der Schnellste war, entscheidet der Gastgeber als Schiedsrichter (welche Antwort
 * bei ihm zuerst ankam) und schickt es als „bonus“ – sonst kämen die Geräte mit ihren eigenen
 * Uhren zu verschiedenen Ergebnissen. Mit Teams zählen die Punkte der Mitglieder zusammen.
 * Wer die Lobby verlässt, wird nicht mehr abgewartet.
 * Jubel: Emotes (Lobby.js) – die anderen sehen die eigene Figur jubeln.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import KarteEbene from '@/components/karte/KarteEbene';
import Buehne from '@/components/karte/Buehne';
import Frage, { JokerKnopf, WeissNicht } from '@/components/karte/Frage';
import { useQuizRunde, VERSUCHE } from '@/components/karte/useQuizRunde';
import Avatar from '@/components/Avatar';
import TonSchalter from '@/components/TonSchalter';
import { Chevron, Flamme } from '@/components/Symbole';
import { EMOTES, TEAMS } from '@/lib/party/regeln';
import { useT } from '@/lib/sprache';

export const DUELL_FRAGEN = 10;
const PAUSE = 1600; // ms zwischen zwei Fragen (Aufdecken ansehen)
const WERT = { gruen: 3, gelb: 1, rot: 0 };
const richtig = (a) => Boolean(a) && a.farbe !== 'rot';

/** Punkte je Spieler: antworten[nummer][spielerId] = { farbe }, bonus[nummer] = spielerId */
function punkteJeSpieler(antworten, bonus) {
  const stand = {};
  for (const [nummer, je] of Object.entries(antworten)) {
    for (const [id, a] of Object.entries(je)) stand[id] = (stand[id] ?? 0) + (WERT[a.farbe] ?? 0);
    if (bonus[nummer]) stand[bonus[nummer]] = (stand[bonus[nummer]] ?? 0) + 1;
  }
  return stand;
}

export default function DuellAnsicht({ gebiet, quiz, party, onLobby, onRevanche }) {
  const t = useT();
  const { satz, daten, reihenfolge, nr } = quiz;
  const ichId = party.ich.id;
  const [antworten, setAntworten] = useState({}); // nummer → { spielerId: { farbe, ankunft } }
  const [bonus, setBonus] = useState({}); // nummer → spielerId
  const host = party.rolle === 'host';
  const bedenkzeit = (quiz.zeit ?? 10) * 1000;

  // Mitspieler dieser Partie: wer beim Start dabei war und noch da ist
  const anwesendIds = new Set(party.spieler.map((s) => s.id));
  const teilnehmer = (quiz.teilnehmer ?? party.spieler.map((s) => s.id)).filter((id) => anwesendIds.has(id) || id === ichId);
  const teilnehmerKette = teilnehmer.join(',');
  const spielerVon = (id) => party.spieler.find((s) => s.id === id) ?? (id === ichId ? party.ich : { id, name: '…' });

  const onFrageFertig = useCallback(
    ({ nummer, farbe }) => {
      setAntworten((a) => ({ ...a, [nummer]: { ...a[nummer], [ichId]: { farbe, ankunft: Date.now() } } }));
      party.senden('antwort', { nr, nummer, farbe });
    },
    [party, nr, ichId],
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
  const ichFertig = Boolean(aktuell[ichId]);
  const andereFertig = teilnehmer.filter((id) => id !== ichId && aktuell[id]).length;
  const alleFertig = teilnehmer.every((id) => aktuell[id]);

  // Antworten der anderen, Schiedssprüche des Gastgebers
  useEffect(
    () =>
      party.abonnieren((n) => {
        if (n.nr !== nr) return;
        if (n.typ === 'antwort') {
          setAntworten((a) => ({ ...a, [n.nummer]: { ...a[n.nummer], [n.von]: { farbe: n.farbe, ankunft: Date.now() } } }));
        } else if (n.typ === 'bonus') {
          setBonus((b) => ({ ...b, [n.nummer]: n.an }));
        }
      }),
    [party, nr],
  );

  // Gastgeber: Sind alle fertig, bekommt der erste richtige Treffer (Ankunft bei ihm) den Bonus
  useEffect(() => {
    if (!host) return;
    for (const [num, je] of Object.entries(antworten)) {
      if (bonus[num] !== undefined) continue;
      if (!teilnehmer.every((id) => je[id])) continue;
      const schnellster = Object.entries(je)
        .filter(([, a]) => richtig(a))
        .sort((x, y) => x[1].ankunft - y[1].ankunft)[0]?.[0];
      setBonus((b) => ({ ...b, [num]: schnellster ?? null }));
      if (schnellster) party.senden('bonus', { nr, nummer: Number(num), an: schnellster });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, antworten, bonus, party, nr, teilnehmerKette]);

  // Ein anderer ist fertig, ich nicht: Bedenkzeit läuft (fest je Frage, sonst liefe beim
  // Wechsel die alte Frist für die neue Frage weiter)
  const [fristen, setFristen] = useState({}); // nummer → Zeitpunkt
  const frist = fristen[nummer] ?? null;
  useEffect(() => {
    if (!fertig && andereFertig > 0 && !ichFertig && !frist) setFristen((f) => ({ ...f, [nummer]: Date.now() + bedenkzeit }));
  }, [fertig, andereFertig, ichFertig, frist, nummer, bedenkzeit]);
  useEffect(() => {
    if (!frist || ichFertig || fertig) return undefined;
    const uhr = setTimeout(zeitUm, Math.max(0, frist - Date.now()));
    return () => clearTimeout(uhr);
  }, [frist, ichFertig, fertig, zeitUm]);
  const [jetzt, setJetzt] = useState(Date.now());
  useEffect(() => {
    if (!frist || ichFertig) return undefined;
    const takt = setInterval(() => setJetzt(Date.now()), 200);
    return () => clearInterval(takt);
  }, [frist, ichFertig]);
  const rest = frist && !ichFertig && !fertig ? Math.max(0, Math.ceil((frist - jetzt) / 1000)) : null;

  // Alle fertig: kurz zeigen, dann für alle weiter
  useEffect(() => {
    if (fertig || !ichFertig || !alleFertig) return undefined;
    const uhr = setTimeout(naechste, PAUSE);
    return () => clearTimeout(uhr);
  }, [fertig, ichFertig, alleFertig, naechste]);

  // Stand: Spieler und (mit Teams) Teams, sortiert nach Punkten
  const stand = punkteJeSpieler(antworten, bonus);
  const tabelle = teilnehmer
    .map((id) => ({ ...spielerVon(id), wert: stand[id] ?? 0, a: aktuell[id] }))
    .sort((a, b) => b.wert - a.wert || a.name.localeCompare(b.name));
  const teams = party.teams
    ? TEAMS.map((team, i) => ({
        ...team,
        i,
        mitglieder: tabelle.filter((s) => party.teams[s.id] === i),
      }))
        .filter((team) => team.mitglieder.length)
        .map((team) => ({ ...team, wert: team.mitglieder.reduce((n, s) => n + s.wert, 0) }))
        .sort((a, b) => b.wert - a.wert)
    : null;
  const titel = t.ortsname({ name: satz.titel, en: satz.titelEn });
  const namenZeigen = useCallback((id) => fertig || Boolean(runde.ergebnis[id]), [fertig, runde.ergebnis]);
  const status = (a) => (!a ? 'sucht' : a.farbe);

  // Ergebnis: Platz des eigenen Spielers bzw. Teams
  const meinTeam = party.teams?.[ichId];
  const sieger = teams ? teams[0] : tabelle[0];
  const gleichstand = teams ? teams.length > 1 && teams[0].wert === teams[1].wert : tabelle.length > 1 && tabelle[0].wert === tabelle[1].wert;
  const gewonnen = !gleichstand && (teams ? sieger?.i === meinTeam : sieger?.id === ichId);
  const platz = (teams ? teams.findIndex((team) => team.i === meinTeam) : tabelle.findIndex((s) => s.id === ichId)) + 1;

  return (
    <>
      <Buehne
        frage={
          !fertig && (
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
                {rest !== null && <span className="rueckmeldung frist">{t('noch {s} s', { s: rest })}</span>}
                {ichFertig && !alleFertig ? (
                  <span className="rueckmeldung info">{t('Warte auf die anderen …')}</span>
                ) : runde.rueckmeldung ? (
                  <span key={runde.rueckmeldung.schluessel} className={`rueckmeldung ${runde.rueckmeldung.art}`}>
                    {runde.rueckmeldung.text}
                  </span>
                ) : (
                  !ichFertig && (
                    <>
                      {zielHatBild && !runde.jokerAktiv && satz.bilder !== 'frage' && runde.jokerRest > 0 && (
                        <JokerKnopf rest={runde.jokerRest} onKlick={runde.jokerZiehen} gesperrt={Boolean(spiel?.sperre)} />
                      )}
                      <WeissNicht onKlick={runde.ueberspringen} gesperrt={Boolean(spiel?.sperre)} />
                    </>
                  )
                )}
              </div>
              {rest !== null && <span className="frist-balken" style={{ '--dauer': `${bedenkzeit}ms` }} key={`frist-${nummer}`} />}
            </div>
          )
        }
      >
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
      </Buehne>

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

        {fertig && (
          <div className="quiz-ergebnis erscheinen">
            <p className={`duell-sieger ${gewonnen ? 'sieg' : gleichstand ? 'gleich' : 'niederlage'}`}>
              {gewonnen ? t('Gewonnen!') : gleichstand ? t('Unentschieden') : t('Platz {n}', { n: platz })}
            </p>
            {teams ? (
              <p className="leise">{t('{team} gewinnt', { team: t.ortsname(sieger) })}</p>
            ) : (
              !gewonnen && sieger && <p className="leise">{t('{name} gewinnt', { name: sieger.name })}</p>
            )}
          </div>
        )}

        {teams && (
          <ol className="team-stand">
            {teams.map((team) => (
              <li key={team.i} style={{ '--team': team.farbe }} className={team.i === meinTeam ? 'ich' : undefined}>
                <span className="team-name">{t.ortsname(team)}</span>
                <strong className="duell-punkte">{team.wert}</strong>
              </li>
            ))}
          </ol>
        )}

        <ol className="duell-stand">
          {tabelle.map((s) => (
            <li key={s.id} className={s.id === ichId ? 'ich' : undefined} style={teams ? { '--team': TEAMS[party.teams?.[s.id] ?? 0].farbe } : undefined}>
              <Avatar wert={s.avatar} groesse={32} />
              <span className="duell-name">
                {s.name}
                {s.id === ichId && <small>{t('du')}</small>}
              </span>
              {!fertig && <span className={`duell-status ${status(s.a)}`} aria-label={t(status(s.a) === 'sucht' ? 'sucht' : 'fertig')} />}
              <strong className="duell-punkte">{s.wert}</strong>
            </li>
          ))}
        </ol>

        <div className="jubel-leiste" role="group" aria-label={t('Jubeln')}>
          {EMOTES.map((em) => (
            <button key={em.art} type="button" onClick={() => party.emote(em.art)} title={t.ortsname({ name: em.text, en: em.en })}>
              <Avatar wert={party.ich.avatar} groesse={30} pose={em.art} />
              <span>{t.ortsname({ name: em.text, en: em.en })}</span>
            </button>
          ))}
        </div>

        <div className="quiz-stand">
          <span className="leise">{t('Grün 3 · Gelb 1 · Schnellster +1')}</span>
          <TonSchalter />
        </div>

        {fertig && (
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
        )}
      </aside>
    </>
  );
}
