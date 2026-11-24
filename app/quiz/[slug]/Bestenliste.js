'use client';
/**
 * Bestenliste.js – Ergebnis eintragen und die besten 10 anzeigen
 *
 * Gespeichert wird in der Supabase-Tabelle „bestenliste“ (supabase/schema.sql).
 * Ist Supabase noch nicht eingerichtet (keine Zugangsdaten), erscheint nur ein Hinweis.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

const PLAETZE = 10;
const NAME_SPEICHER = 'geo-quiz-name';

export default function Bestenliste({ quiz, punkte, fragen, sekunden }) {
  const db = supabase();
  const [eintraege, setEintraege] = useState(null);
  const [name, setName] = useState('');
  const [gespeichert, setGespeichert] = useState(false);
  const [fehler, setFehler] = useState('');

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
    return <p className="hinweis">Die Bestenliste ist noch nicht eingerichtet (Supabase fehlt).</p>;
  }

  async function eintragen(e) {
    e.preventDefault();
    const sauber = name.trim();
    if (!sauber) return setFehler('Bitte gib einen Namen ein.');
    if (sauber.length > 20) return setFehler('Der Name darf höchstens 20 Zeichen lang sein.');

    const { error } = await db.from('bestenliste').insert({ quiz, name: sauber, punkte, fragen, sekunden });
    if (error) return setFehler('Speichern hat nicht geklappt. Bitte später noch einmal versuchen.');

    try {
      localStorage.setItem(NAME_SPEICHER, sauber);
    } catch {
      /* egal */
    }
    setFehler('');
    setGespeichert(true);
    laden();
  }

  return (
    <div className="bestenliste">
      {!gespeichert && (
        <form onSubmit={eintragen} className="eintragen" noValidate>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dein Name"
            maxLength={20}
            aria-label="Dein Name"
          />
          <button className="knopf">In Bestenliste eintragen</button>
        </form>
      )}
      {fehler && <p className="fehler">{fehler}</p>}

      <h2>Bestenliste</h2>
      {eintraege === null ? (
        <p className="hinweis">Wird geladen …</p>
      ) : eintraege.length === 0 ? (
        <p className="hinweis">Noch keine Einträge. Sei die erste Person!</p>
      ) : (
        <ol>
          {eintraege.map((e) => (
            <li key={e.id}>
              <span>{e.name}</span>
              <span>
                {e.punkte}/{e.fragen} · {e.sekunden} s
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
