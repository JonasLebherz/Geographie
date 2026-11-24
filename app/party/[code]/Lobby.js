'use client';
/**
 * app/party/[code]/Lobby.js – eine Party-Lobby (1 gegen 1)
 *
 * Oben die Lobby-Leiste: Code, Link kopieren, wer da ist. Darunter dieselbe Karte wie beim
 * Solo-Spiel (Erkundung) – im Party-Modus:
 *  - Gastgeber (wer die Lobby erstellt hat) fliegt durch die Karte und wählt das Quiz.
 *    Der Gast fliegt automatisch mit.
 *  - Startet der Gastgeber ein Quiz, bekommen beide dieselben Fragen in derselben Reihenfolge.
 *    Wer eine Frage erledigt hat, wartet; der andere hat dann noch 10 Sekunden (DuellAnsicht).
 *
 * Verbindung: lib/party/kanal.js (Supabase Realtime, lokal BroadcastChannel). Gespeichert
 * wird nichts – schließen beide den Tab, ist die Lobby weg.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Erkundung from '@/app/karte/Erkundung';
import { kanalOeffnen } from '@/lib/party/kanal';
import { useT } from '@/lib/sprache';
import { Kette } from '@/components/Symbole';
import { GASTGEBER } from '../PartyStart';

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

export default function Lobby({ code }) {
  const t = useT();
  const [ich, setIch] = useState(null); // { id, name, host }
  const [nameEingabe, setNameEingabe] = useState('');
  const [anwesend, setAnwesend] = useState([]);
  const [welt, setWelt] = useState(null);
  const [kopiert, setKopiert] = useState(false);
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
    setNameEingabe(name);
    setIch({ id: spielerId(), name, host });
  }, [code]);

  // Weltkarte für die Erkundung laden
  useEffect(() => {
    fetch('/karte-daten/welt/gebiet.json').then((a) => a.json()).then(setWelt).catch(() => {});
  }, []);

  // Verbindung, sobald ein Name da ist
  const bereit = Boolean(ich?.name);
  useEffect(() => {
    if (!bereit) return undefined;
    const k = kanalOeffnen(code, {
      ich,
      onAnwesend: setAnwesend,
      onNachricht: (nachricht) => abonnenten.current.forEach((fn) => fn(nachricht)),
    });
    kanal.current = k;
    return () => {
      k.schliessen();
      kanal.current = null;
    };
    // Bewusst nur beim Betreten (Namenswechsel geht über aktualisieren)
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

  // Gegner: der erste andere Anwesende; Gastgeber ist, wer die Lobby erstellt hat
  const gegner = useMemo(() => anwesend.find((a) => a.id !== ich?.id) ?? null, [anwesend, ich]);
  const voll = anwesend.filter((a) => a.id !== ich?.id).length > 1 && !ich?.host;

  const senden = useCallback((typ, daten) => kanal.current?.senden(typ, daten), []);
  const abonnieren = useCallback((fn) => {
    abonnenten.current.add(fn);
    return () => abonnenten.current.delete(fn);
  }, []);
  const party = useMemo(
    () => (ich?.name ? { rolle: ich.host ? 'host' : 'gast', ich, gegner, senden, abonnieren } : null),
    [ich, gegner, senden, abonnieren],
  );

  if (!ich) return null;

  // Erst der Name – damit der andere weiß, gegen wen er spielt
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
        <ul className="lobby-spieler" aria-label={t('Spieler')}>
          {[ich, gegner].map((s, i) =>
            s ? (
              <li key={s.id} className={s.id === ich.id ? 'ich' : undefined}>
                <span className="anwesend" />
                {s.name}
                {s.host && <small>{t('Gastgeber')}</small>}
              </li>
            ) : (
              <li key={`frei-${i}`} className="frei">
                <span className="warten" />
                {t('Warte auf Mitspieler …')}
              </li>
            ),
          )}
        </ul>
      </div>

      {voll ? (
        <p className="hinweis">{t('Diese Lobby ist schon voll.')}</p>
      ) : welt ? (
        <Erkundung start={welt} party={party} />
      ) : (
        <div className="buehne-platzhalter" />
      )}
    </div>
  );
}
