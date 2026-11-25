'use client';
/**
 * app/party/[code]/Lobby.js – eine Party-Lobby für bis zu 8 Spieler
 *
 * Oben die Lobby-Leiste: Code, Link kopieren, Spieler mit ihrer Comic-Figur und – beim
 * Gastgeber – das Zahnrad mit den Spielregeln. Mit Teams erscheinen Team-Felder; der Gastgeber
 * schiebt Spieler per Ziehen (oder Antippen, dann Feld antippen) von einem Team ins andere.
 * Darunter die Spielwahl (Gastgeber): Weltkarte, Wissensquiz oder Schätzen (Regel `modus`).
 * Wissensquiz und Schätzen laufen in FragenParty.js. Die Weltkarte ist dieselbe Karte wie beim
 * Solo-Spiel (Erkundung) im Party-Modus:
 *  - Der Gastgeber (wer die Lobby erstellt hat) fliegt durch die Karte und wählt das Quiz,
 *    alle anderen fliegen mit.
 *  - Startet er ein Quiz, bekommen alle dieselben Fragen in derselben Reihenfolge
 *    (Partie in app/karte/DuellAnsicht.js).
 * Spielregeln (Gastgeber): Teams aus/2/3/4, Fragen je Runde, Joker je Spieler, feste Ansicht
 * (Karte oder Satellit), Bedenkzeit für die anderen, sobald einer geantwortet hat.
 * Jubel: Emotes (Jubel, Daumen hoch, Oh nein) sehen alle als Sprechblase mit der Figur.
 *
 * Verbindung: lib/party/kanal.js (Supabase Realtime, lokal BroadcastChannel). Gespeichert wird
 * nichts – schließen alle den Tab, ist die Lobby weg. Nachrichten des Gastgebers:
 * `einstellungen` (Regeln + Teams), dazu wie bisher `gebiet`, `start`, `lobby`, `bonus`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Erkundung from '@/app/karte/Erkundung';
import Avatar, { avatarAus } from '@/components/Avatar';
import { kanalOeffnen } from '@/lib/party/kanal';
import { AnsichtKontext } from '@/lib/party/ansicht';
import { EMOTES, MAX_SPIELER, MODI, STANDARD_REGELN, TEAMS } from '@/lib/party/regeln';
import { useEinstellung } from '@/lib/einstellungen';
import { useT } from '@/lib/sprache';
import { klang } from '@/lib/ton';
import { Kette } from '@/components/Symbole';
import { GASTGEBER } from '../PartyStart';
import FreundeEinladen from '@/components/FreundeEinladen';
import FragenParty from './FragenParty';

const NAME_SPEICHER = 'geo-quiz-name';
const SPIELER_SPEICHER = 'geo-quiz-spieler';
function spielerId() {
  try {
    let id = sessionStorage.getItem(SPIELER_SPEICHER);
    if (!id) {
      id = `s${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SPIELER_SPEICHER, id);
    }
    return id;
  } catch {
    return `s${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** Spieler ohne Team ins kleinste Team, Abwesende entfernen */
function teamsVerteilen(zuordnung, spieler, anzahl) {
  if (!anzahl) return {};
  const neu = {};
  for (const s of spieler) if (zuordnung[s.id] !== undefined && zuordnung[s.id] < anzahl) neu[s.id] = zuordnung[s.id];
  for (const s of spieler) {
    if (neu[s.id] !== undefined) continue;
    const groesse = Array.from({ length: anzahl }, (_, i) => Object.values(neu).filter((t) => t === i).length);
    neu[s.id] = groesse.indexOf(Math.min(...groesse));
  }
  return neu;
}

export default function Lobby({ code }) {
  const t = useT();
  const [avatarEigen] = useEinstellung('avatar');
  const [ich, setIch] = useState(null); // { id, name, host, avatar }
  const [nameEingabe, setNameEingabe] = useState('');
  const [anwesend, setAnwesend] = useState([]);
  const [welt, setWelt] = useState(null);
  const [kopiert, setKopiert] = useState(false);
  const [regeln, setRegeln] = useState(STANDARD_REGELN);
  const [zuordnung, setZuordnung] = useState({}); // Spieler → Team
  const [zahnrad, setZahnrad] = useState(false);
  const [gewaehlt, setGewaehlt] = useState(null); // Antippen statt Ziehen
  const [emotes, setEmotes] = useState([]); // [{ schluessel, von, art }]
  const [imSpiel, setImSpiel] = useState(false); // läuft gerade eine Runde? Dann keine Spielwahl
  const kanal = useRef(null);
  const abonnenten = useRef(new Set());

  // Wer bin ich? (Name aus früheren Spielen, Gastgeber-Merker aus PartyStart)
  useEffect(() => {
    let name = '';
    let host = false;
    try {
      name = localStorage.getItem(NAME_SPEICHER) ?? '';
      host = sessionStorage.getItem(GASTGEBER(code)) === '1';
    } catch {
      /* privat */
    }
    const id = spielerId();
    setNameEingabe(name);
    setIch({ id, name, host, avatar: '' });
  }, [code]);

  // Eigene Figur (oder eine aus der Kennung gewürfelte)
  const meineFigur = avatarEigen || (ich ? avatarAus(ich.id) : '');
  useEffect(() => {
    if (!ich || ich.avatar === meineFigur) return;
    setIch((alt) => ({ ...alt, avatar: meineFigur }));
    kanal.current?.aktualisieren({ avatar: meineFigur });
  }, [meineFigur, ich]);

  // Weltkarte für die Erkundung laden
  useEffect(() => {
    fetch('/karte-daten/welt/gebiet.json').then((a) => a.json()).then(setWelt).catch(() => {});
  }, []);

  const emoteZeigen = useCallback((von, art) => {
    const schluessel = `${von}-${Date.now()}`;
    setEmotes((alt) => [...alt.slice(-4), { schluessel, von, art }]);
    setTimeout(() => setEmotes((alt) => alt.filter((e) => e.schluessel !== schluessel)), 2800);
  }, []);

  // Verbindung, sobald ein Name da ist
  const bereit = Boolean(ich?.name && ich?.avatar);
  useEffect(() => {
    if (!bereit) return undefined;
    const k = kanalOeffnen(code, {
      ich,
      onAnwesend: setAnwesend,
      onNachricht: (nachricht) => {
        if (nachricht.typ === 'einstellungen') {
          setRegeln({ ...STANDARD_REGELN, ...nachricht.regeln });
          setZuordnung(nachricht.teams ?? {});
        } else if (nachricht.typ === 'emote') {
          emoteZeigen(nachricht.von, nachricht.art);
          klang('richtig');
        }
        abonnenten.current.forEach((fn) => fn(nachricht));
      },
    });
    kanal.current = k;
    return () => {
      k.schliessen();
      kanal.current = null;
    };
    // Bewusst nur beim Betreten (Namens- und Figurwechsel gehen über aktualisieren)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bereit, code]);

  function nameSetzen(e) {
    e.preventDefault();
    const name = nameEingabe.trim().slice(0, 20);
    if (!name) return;
    try {
      localStorage.setItem(NAME_SPEICHER, name);
    } catch {
      /* egal */
    }
    setIch((alt) => ({ ...alt, name }));
    kanal.current?.aktualisieren({ name });
  }

  async function linkKopieren() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 1800);
    } catch {
      /* ohne Zwischenablage: Link steht ja in der Adresszeile */
    }
  }

  // Spieler: Gastgeber zuerst, dann nach Ankunft; höchstens MAX_SPIELER dürfen mitspielen
  const alle = useMemo(
    () => [...anwesend].sort((a, b) => Number(b.host) - Number(a.host) || (a.seit ?? 0) - (b.seit ?? 0) || a.id.localeCompare(b.id)),
    [anwesend],
  );
  const spieler = useMemo(() => {
    const liste = alle.slice(0, MAX_SPIELER);
    if (ich && !liste.some((s) => s.id === ich.id) && alle.length < MAX_SPIELER) liste.push(ich);
    return liste.map((s) => ({ ...s, avatar: s.avatar || avatarAus(s.id) }));
  }, [alle, ich]);
  const voll = Boolean(ich) && alle.length > MAX_SPIELER && !spieler.some((s) => s.id === ich.id);
  const host = Boolean(ich?.host);
  const spielerKette = spieler.map((s) => s.id).join(',');

  // Gastgeber: Teams verteilen und Regeln an alle schicken (auch an Neuankömmlinge)
  useEffect(() => {
    if (!host) return;
    const neu = teamsVerteilen(zuordnung, spieler, regeln.teams);
    if (JSON.stringify(neu) !== JSON.stringify(zuordnung)) setZuordnung(neu);
    kanal.current?.senden('einstellungen', { regeln, teams: neu });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, regeln, spielerKette, JSON.stringify(zuordnung)]);

  const regelSetzen = (name, wert) => setRegeln((r) => ({ ...r, [name]: wert }));
  const insTeam = (spielerId, team) => {
    if (!host) return;
    setZuordnung((z) => ({ ...z, [spielerId]: team }));
    setGewaehlt(null);
  };

  const senden = useCallback((typ, daten) => kanal.current?.senden(typ, daten), []);
  const abonnieren = useCallback((fn) => {
    abonnenten.current.add(fn);
    return () => abonnenten.current.delete(fn);
  }, []);
  const emote = useCallback(
    (art) => {
      if (!ich) return;
      kanal.current?.senden('emote', { art });
      emoteZeigen(ich.id, art);
    },
    [ich, emoteZeigen],
  );
  const gegner = spieler.find((s) => s.id !== ich?.id) ?? null;
  const party = useMemo(
    () =>
      ich?.name
        ? {
            rolle: ich.host ? 'host' : 'gast',
            ich: { ...ich, avatar: meineFigur },
            spieler,
            gegner,
            gastgeber: spieler.find((s) => s.host) ?? null,
            teams: regeln.teams ? zuordnung : null,
            regeln,
            senden,
            abonnieren,
            emote,
          }
        : null,
    [ich, meineFigur, spieler, gegner, regeln, zuordnung, senden, abonnieren, emote],
  );

  if (!ich) return null;

  // Erst der Name – damit die anderen wissen, gegen wen sie spielen
  if (!ich.name) {
    return (
      <div className="party-start">
        <header className="seitenkopf">
          <p className="eyebrow">{t('Party')} · {code}</p>
          <h1>{t('Wie heißt du?')}</h1>
        </header>
        <form className="karte party-name" onSubmit={nameSetzen} noValidate>
          <input
            value={nameEingabe}
            onChange={(e) => setNameEingabe(e.target.value)}
            placeholder={t('Name')}
            maxLength={20}
            aria-label={t('Name')}
            autoFocus
          />
          <button className="knopf knopf-haupt knopf-gross" disabled={!nameEingabe.trim()}>
            {t('Los geht’s')}
          </button>
        </form>
      </div>
    );
  }

  const spielerChip = (s) => (
    <li
      key={s.id}
      className={`lobby-chip${s.id === ich.id ? ' ich' : ''}${gewaehlt === s.id ? ' gewaehlt' : ''}`}
      draggable={host && Boolean(regeln.teams)}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', s.id)}
      onClick={() => host && regeln.teams && setGewaehlt((g) => (g === s.id ? null : s.id))}
    >
      <Avatar wert={s.avatar} groesse={34} />
      <span className="lobby-chip-name">{s.name}</span>
      {s.host && <small>{t('Gastgeber')}</small>}
    </li>
  );

  return (
    <div className="lobby">
      <div className="lobby-leiste karte">
        <div className="lobby-code">
          <span className="leise">{t('Lobby')}</span>
          <strong>{code}</strong>
        </div>
        <button type="button" className="knopf knopf-zweit" onClick={linkKopieren}>
          <Kette />
          {kopiert ? t('Kopiert') : t('Link kopieren')}
        </button>
        <FreundeEinladen code={code} imSpiel={spieler.map((s) => s.name)} />
        {!regeln.teams && (
          <ul className="lobby-spieler" aria-label={t('Spieler')}>
            {spieler.map(spielerChip)}
            {spieler.length < 2 && (
              <li className="frei">
                <span className="warten" />
                {t('Warte auf Mitspieler …')}
              </li>
            )}
          </ul>
        )}
        <span className="lobby-zahl">{t('{n} von {m}', { n: spieler.length, m: MAX_SPIELER })}</span>
        {host ? (
          <button
            type="button"
            className={`zahnrad${zahnrad ? ' offen' : ''}`}
            onClick={() => setZahnrad((z) => !z)}
            aria-expanded={zahnrad}
            aria-label={t('Spielregeln')}
            title={t('Spielregeln')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
              <circle cx="12" cy="12" r="6.5" />
            </svg>
          </button>
        ) : (
          <span className="regeln-kurz">{regelnKurz(t, regeln)}</span>
        )}
        {/* Jubel der anderen: kurz in der Lobby-Leiste, nicht über der Karte */}
        <div className="emote-schicht" aria-live="polite">
          {emotes.map((e) => {
            const s = spieler.find((x) => x.id === e.von);
            const em = EMOTES.find((x) => x.art === e.art) ?? EMOTES[0];
            return (
              <div key={e.schluessel} className="emote-blase">
                <Avatar wert={s?.avatar ?? avatarAus(e.von)} groesse={44} pose={e.art} />
                <span>
                  <strong>{s?.name ?? '…'}</strong>
                  {t.ortsname({ name: em.text, en: em.en })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {host && zahnrad && <Spielregeln regeln={regeln} onSetzen={regelSetzen} />}

      {!imSpiel && !voll && (
        <div className="spielwahl segment-schalter" role="radiogroup" aria-label={t('Spiel')}>
          {MODI.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={regeln.modus === m.id}
              className={regeln.modus === m.id ? 'gewaehlt' : undefined}
              onClick={() => host && regelSetzen('modus', m.id)}
              disabled={!host && regeln.modus !== m.id}
            >
              {t.ortsname(m)}
            </button>
          ))}
        </div>
      )}

      {Boolean(regeln.teams) && (
        <div className="team-felder" style={{ '--spalten': regeln.teams }}>
          {Array.from({ length: regeln.teams }, (_, i) => (
            <section
              key={i}
              className={`team-feld${gewaehlt ? ' ziel' : ''}`}
              style={{ '--team': TEAMS[i].farbe }}
              onDragOver={(e) => host && e.preventDefault()}
              onDrop={(e) => insTeam(e.dataTransfer.getData('text/plain'), i)}
              onClick={() => gewaehlt && insTeam(gewaehlt, i)}
            >
              <h3>{t.ortsname(TEAMS[i])}</h3>
              <ul>{spieler.filter((s) => zuordnung[s.id] === i).map(spielerChip)}</ul>
            </section>
          ))}
        </div>
      )}

      {voll ? (
        <p className="hinweis">{t('Diese Lobby ist schon voll.')}</p>
      ) : regeln.modus !== 'karte' && party ? (
        <FragenParty modus={regeln.modus} party={party} regeln={regeln} onSpielt={setImSpiel} />
      ) : welt ? (
        <AnsichtKontext.Provider value={regeln.ansicht}>
          <Erkundung start={welt} party={party} onImQuiz={setImSpiel} />
        </AnsichtKontext.Provider>
      ) : (
        <div className="buehne-platzhalter" />
      )}
    </div>
  );
}

/** Kurzfassung der Regeln für die Mitspieler */
function regelnKurz(t, r) {
  const karte = (r.modus ?? 'karte') === 'karte';
  const teile = [r.teams ? t('{n} Teams', { n: r.teams }) : t('Jeder für sich'), t('{n} Fragen', { n: r.fragen })];
  if (karte) teile.push(t('{n} Joker', { n: r.joker }));
  if (karte && r.ansicht !== 'frei') teile.push(r.ansicht === 'satellit' ? t('nur Satellit') : t('nur Karte'));
  return teile.join(' · ');
}

/** Zahnrad-Feld des Gastgebers: Spielregeln als Segment-Schalter */
function Spielregeln({ regeln, onSetzen }) {
  const t = useT();
  const reihen = [
    ['teams', t('Teams'), [[0, t('Aus')], [2, '2'], [3, '3'], [4, '4']]],
    ['fragen', t('Fragen je Runde'), [[5, '5'], [10, '10'], [15, '15'], [20, '20']]],
    ['joker', t('Joker je Spieler'), [[0, '0'], [1, '1'], [3, '3'], [5, '5']]],
    ['zeit', t('Bedenkzeit danach'), [[5, '5 s'], [10, '10 s'], [20, '20 s'], [30, '30 s']]],
    ['ansicht', t('Ansicht'), [['frei', t('Frei')], ['karte', t('Karte')], ['satellit', t('Satellit')]]],
  ].filter(([name]) => (regeln.modus ?? 'karte') === 'karte' || !['joker', 'ansicht'].includes(name));
  return (
    <div className="spielregeln karte">
      {reihen.map(([name, titel, optionen]) => (
        <div key={name} className="einstellung">
          <span className="einstellung-titel">{titel}</span>
          <div className="segment-schalter" role="radiogroup" aria-label={titel}>
            {optionen.map(([wert, text]) => (
              <button
                key={wert}
                type="button"
                role="radio"
                aria-checked={regeln[name] === wert}
                className={regeln[name] === wert ? 'gewaehlt' : undefined}
                onClick={() => onSetzen(name, wert)}
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
