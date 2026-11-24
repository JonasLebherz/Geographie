'use client';
/**
 * QuizSpiel.js – das eigentliche Spiel (läuft im Browser)
 *
 * Ablauf: Es werden `runden` zufällige Gebiete gezogen. Pro Runde wird der
 * Umriss gezeigt, dazu 4 Antworten (1 richtige, 3 falsche). Am Ende kommt
 * die Punktzahl.
 */
import { useEffect, useState } from 'react';
import { GROESSE } from '@/lib/geodaten/umriss';
import Bestenliste from './Bestenliste';

const ANTWORTEN = 4;

/** Mischt eine Liste zufällig (Fisher-Yates) und gibt eine neue Liste zurück. */
function mischen(liste) {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

/** Stellt die Fragen für ein neues Spiel zusammen. */
function neuesSpiel(gebiete, runden) {
  return mischen(gebiete)
    .slice(0, Math.min(runden, gebiete.length))
    .map((richtig) => {
      const falsche = mischen(gebiete.filter((g) => g.id !== richtig.id)).slice(0, ANTWORTEN - 1);
      return { richtig, antworten: mischen([richtig, ...falsche]) };
    });
}

export default function QuizSpiel({ quiz, gebiete, frage, runden }) {
  // Die Fragen werden erst im Browser gezogen (useEffect). Würde schon der Server
  // würfeln, passten Server- und Browser-Ergebnis nicht zusammen.
  const [fragen, setFragen] = useState(null);
  const [nummer, setNummer] = useState(0);
  const [gewaehlt, setGewaehlt] = useState(null);
  const [punkte, setPunkte] = useState(0);
  const [start, setStart] = useState(0); // Startzeit in ms, für die Spieldauer
  const [ende, setEnde] = useState(0);

  function starten() {
    setFragen(neuesSpiel(gebiete, runden));
    setNummer(0);
    setGewaehlt(null);
    setPunkte(0);
    setStart(Date.now());
    setEnde(0);
  }

  useEffect(starten, [gebiete, runden]);

  if (!fragen) return <p className="hinweis">Quiz wird vorbereitet …</p>;

  // Spiel vorbei
  if (nummer >= fragen.length) {
    return (
      <div className="karte ergebnis">
        <p className="punkte">
          {punkte} von {fragen.length} richtig
        </p>
        <p className="hinweis">Zeit: {Math.max(1, Math.round((ende - start) / 1000))} Sekunden</p>
        <Bestenliste
          quiz={quiz}
          punkte={punkte}
          fragen={fragen.length}
          sekunden={Math.max(1, Math.round((ende - start) / 1000))}
        />
        <button className="knopf weiter" onClick={starten}>
          Noch einmal spielen
        </button>
      </div>
    );
  }

  const { richtig, antworten } = fragen[nummer];

  function antworten_(gebiet) {
    if (gewaehlt) return; // pro Frage nur eine Antwort
    setGewaehlt(gebiet);
    if (nummer + 1 === fragen.length) setEnde(Date.now()); // letzte Frage: Zeit stoppen
    if (gebiet.id === richtig.id) setPunkte((p) => p + 1);
  }

  return (
    <div className="karte">
      <div className="stand">
        <span>
          Frage {nummer + 1} von {fragen.length}
        </span>
        <span>{punkte} Punkte</span>
      </div>

      <p className="frage">{frage}</p>

      <svg
        className="umriss"
        viewBox={`0 0 ${GROESSE} ${GROESSE}`}
        role="img"
        aria-label="Umriss des gesuchten Gebiets"
      >
        <path d={richtig.pfad} />
      </svg>

      <div className="antworten">
        {antworten.map((gebiet) => {
          let klasse = 'antwort';
          if (gewaehlt) {
            if (gebiet.id === richtig.id) klasse += ' richtig';
            else if (gebiet.id === gewaehlt.id) klasse += ' falsch';
          }
          return (
            <button key={gebiet.id} className={klasse} onClick={() => antworten_(gebiet)} disabled={!!gewaehlt}>
              {gebiet.name}
            </button>
          );
        })}
      </div>

      {gewaehlt && (
        <button
          className="knopf weiter"
          onClick={() => {
            setNummer((n) => n + 1);
            setGewaehlt(null);
          }}
        >
          {nummer + 1 < fragen.length ? 'Weiter' : 'Ergebnis anzeigen'}
        </button>
      )}
    </div>
  );
}
