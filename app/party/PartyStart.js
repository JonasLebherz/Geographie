'use client';
/**
 * app/party/PartyStart.js – Lobby erstellen (bekommt einen Wort-Code wie „flinker-pinguin“)
 * oder beitreten (Code oder ganzen Link eingeben).
 * Wer erstellt, ist Gastgeber: wählt Gebiet und Quiz, beide spielen dieselben Fragen.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/sprache';
import { codeAus, neuerCode } from '@/lib/party/codes';
import { Gruppe, Kette } from '@/components/Symbole';

export const GASTGEBER = (code) => `geo-quiz-gastgeber-${code}`;

export default function PartyStart() {
  const t = useT();
  const router = useRouter();
  const [eingabe, setEingabe] = useState('');
  const [fehler, setFehler] = useState('');

  function erstellen() {
    const code = neuerCode();
    try {
      sessionStorage.setItem(GASTGEBER(code), '1');
    } catch {
      /* ohne Speicher ist man eben Gast */
    }
    router.push(`/party/${code}`);
  }

  function beitreten(e) {
    e.preventDefault();
    const code = codeAus(eingabe);
    if (!code) return setFehler(t('Diesen Code gibt es so nicht. Beispiel: flinker-pinguin'));
    router.push(`/party/${code}`);
  }

  return (
    <div className="party-start">
      <header className="seitenkopf erscheinen">
        <p className="eyebrow">{t('Party')}</p>
        <h1>{t('1 gegen 1')}</h1>
        <p className="fakten">{t('Gleiche Fragen, gleiche Karte – wer findet es zuerst?')}</p>
      </header>

      <div className="party-wahl">
        <section className="karte party-karte erscheinen" style={{ '--i': 1 }}>
          <span className="party-symbol">
            <Gruppe />
          </span>
          <h2>{t('Lobby erstellen')}</h2>
          <p className="leise">{t('Du bekommst einen Link zum Teilen und wählst das Quiz.')}</p>
          <button type="button" className="knopf knopf-haupt knopf-gross" onClick={erstellen}>
            {t('Lobby erstellen')}
          </button>
        </section>

        <section className="karte party-karte erscheinen" style={{ '--i': 2 }}>
          <span className="party-symbol">
            <Kette />
          </span>
          <h2>{t('Lobby beitreten')}</h2>
          <p className="leise">{t('Code oder Link aus der Einladung eingeben.')}</p>
          <form className="beitreten" onSubmit={beitreten} noValidate>
            <input
              value={eingabe}
              onChange={(e) => {
                setEingabe(e.target.value);
                setFehler('');
              }}
              placeholder="flinker-pinguin"
              aria-label={t('Code oder Link')}
              autoCapitalize="off"
              autoComplete="off"
              spellCheck={false}
            />
            <button className="knopf knopf-zweit knopf-gross">{t('Beitreten')}</button>
          </form>
          {fehler && <p className="fehler">{fehler}</p>}
        </section>
      </div>
    </div>
  );
}
