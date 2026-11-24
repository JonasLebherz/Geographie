'use client';
/**
 * components/Hilfe.js – „?“ in der Kopfleiste: kurz erklärt, wie das Spiel geht
 *
 * Ersetzt die frühere große Begrüßung auf der Startseite (Wunsch: kein großer Text auf der Karte,
 * die Erklärung liegt hinter dem Fragezeichen). Bedienung wie das Profil-Menü: Klick daneben
 * oder Esc schließt, der Fokus geht zurück auf den Knopf.
 */
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { useT } from '@/lib/sprache';
import { Fragezeichen, Gruppe } from './Symbole';

export default function Hilfe() {
  const t = useT();
  const [offen, setOffen] = useState(false);
  const huelle = useRef(null);
  const knopf = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!offen) return undefined;
    const daneben = (e) => {
      if (!huelle.current?.contains(e.target)) setOffen(false);
    };
    const taste = (e) => {
      if (e.key === 'Escape') {
        setOffen(false);
        knopf.current?.focus();
      }
    };
    document.addEventListener('pointerdown', daneben);
    document.addEventListener('keydown', taste);
    return () => {
      document.removeEventListener('pointerdown', daneben);
      document.removeEventListener('keydown', taste);
    };
  }, [offen]);

  const schritte = [
    t('Gebiet auf der Karte anklicken – die Kamera fliegt hinein.'),
    t('Quiz wählen: rechts für dieses Gebiet, links unter „Alle Quizze“ für alle.'),
    t('Gesuchtes auf der Karte finden. Drei Versuche: grün beim ersten, gelb beim zweiten oder dritten, sonst rot.'),
    t('„Am nächsten dran“: irgendwohin klicken – je näher, desto mehr Punkte.'),
  ];

  return (
    <div className="profil hilfe" ref={huelle}>
      <button
        ref={knopf}
        type="button"
        className="profil-knopf"
        aria-expanded={offen}
        aria-controls={id}
        aria-label={t('So geht’s')}
        title={t('So geht’s')}
        onClick={() => setOffen((o) => !o)}
      >
        <Fragezeichen />
      </button>
      {offen && (
        <div className="profil-menue hilfe-karte" id={id} role="dialog" aria-labelledby={`${id}-titel`}>
          <h2 className="hilfe-titel" id={`${id}-titel`}>
            {t('So geht’s')}
          </h2>
          <ol className="schritte">
            {schritte.map((text, i) => (
              <li key={i} style={{ '--i': i + 1 }}>
                <span className="schritt-nr">{i + 1}</span>
                {text}
              </li>
            ))}
          </ol>
          <Link href="/party" className="knopf knopf-zweit knopf-breit" onClick={() => setOffen(false)}>
            <Gruppe />
            {t('Mit Freunden spielen')}
          </Link>
        </div>
      )}
    </div>
  );
}
