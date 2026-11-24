'use client';
/**
 * components/Bestenliste.js – Ergebnis eintragen und die besten 10 anzeigen
 *
 * Gespeichert wird in der Supabase-Tabelle „bestenliste“ (supabase/schema.sql).
 * Ist Supabase noch nicht eingerichtet (keine Zugangsdaten), erscheint nur ein Hinweis.
 *
 * quiz:     Name in der Tabelle, z. B. "laender" oder "kontinent-europa"
 * punkte, fragen, sekunden: das eigene Ergebnis
 * wertText: wie ein Eintrag angezeigt wird, z. B. (e) => `${e.punkte} %` (Standard: „7/10“)
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useT } from '@/lib/sprache';

const PLAETZE = 10;
const NAME_SPEICHER = 'geo-quiz-name';

const standardText = (e) => `${e.punkte}/${e.fragen}`;

/** Sekunden als „0:42“ bzw. „12:05“ */
export function dauer(sekunden) {
  const m = Math.floor(sekunden / 60);
  const s = String(sekunden % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function Bestenliste({ quiz, punkte, fragen, sekunden, wertText = standardText }) {
  const t = useT();
  const db = supabase();
  const [eintraege, setEintraege] = useState(null);
  const [name, setName] = useState('');
  const [eigeneId, setEigeneId] = useState(null);
  const [fehler, setFehler] = useState('');
  const [sendet, setSendet] = useState(false);

  const laden = useCallback(async () => {
    if (!db) return;
    const { data, error } = await db
      .from('bestenliste')
      .select('id, name, punkte, fragen, sekunden')
      .eq('quiz', quiz)
      .order('punkte', { ascending: false })
      .order('sekunden', { ascending: true })
      .limit(PLAETZE);
    if (error) setFehler('Die Bestenliste konnte nicht geladen werden.');
    else setEintraege(data);
  }, [db, quiz]);

  useEffect(() => {
    laden();
    // Den zuletzt benutzten Namen vorschlagen (nur in diesem Browser gespeichert)
    try {
      setName(localStorage.getItem(NAME_SPEICHER) ?? '');
    } catch {
      /* z. B. privates Fenster – dann eben leer */
    }
  }, [laden]);

  if (!db) {
    return <p className="hinweis">{t('Bestenliste nicht eingerichtet.')}</p>;
  }

  async function eintragen(e) {
    e.preventDefault();
    const sauber = name.trim();
    if (!sauber) return setFehler('Bitte einen Namen eingeben.');
    if (sauber.length > 20) return setFehler('Der Name darf höchstens 20 Zeichen lang sein.');

    setSendet(true);
    const { data, error } = await db
      .from('bestenliste')
      .insert({ quiz, name: sauber, punkte, fragen, sekunden })
      .select('id')
      .single();
    setSendet(false);
    if (error) return setFehler('Speichern hat nicht geklappt. Bitte später noch einmal versuchen.');

    try {
      localStorage.setItem(NAME_SPEICHER, sauber);
    } catch {
      /* egal */
    }
    setFehler('');
    setEigeneId(data.id);
    laden();
  }

  return (
    <div className="bestenliste">
      <h2>{t('Bestenliste')}</h2>
      {eigeneId ? (
        <p className="eingetragen">{t('Eingetragen.')}</p>
      ) : (
        <form onSubmit={eintragen} className="eintragen" noValidate>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('Name')}
            maxLength={20}
            aria-label={t('Name für die Bestenliste')}
            autoComplete="nickname"
          />
          <button className="knopf knopf-zweit" disabled={sendet}>
            {t('Eintragen')}
          </button>
        </form>
      )}
      {fehler && <p className="fehler">{t(fehler)}</p>}

      {eintraege === null ? (
        <p className="hinweis">{t('Wird geladen …')}</p>
      ) : eintraege.length === 0 ? (
        <p className="hinweis">{t('Noch keine Einträge.')}</p>
      ) : (
        <ol>
          {eintraege.map((e) => (
            <li key={e.id} className={e.id === eigeneId ? 'eigener' : undefined}>
              <span className="name">{e.name}</span>
              <span className="wert">{wertText(e)}</span>
              <span className="dauer">{dauer(e.sekunden)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
