'use client';
/**
 * components/karte/Buehne.js – Bühne mit Kopfleiste: oben die Frage und die Kartenknöpfe,
 * darunter die Karte, auf der nichts liegt
 *
 * Wunsch: Nichts darf die Karte verdecken (früher lagen Frage-Kapsel, Bild, Zoom und der Schalter
 * Karte/Satellit auf der Karte). Die Kopfleiste über der Bühne trägt links die Frage (`frage`)
 * und rechts die Kartenknöpfe. Die Knöpfe gehören zur jeweils aktiven Kartenebene
 * (KarteEbene) – sie werden per Portal in die Leiste gesetzt (SteuerungsKontext).
 */
import { createContext, useState } from 'react';

/** DOM-Knoten in der Kopfleiste, in den die aktive Kartenebene ihre Knöpfe setzt */
export const SteuerungsKontext = createContext(null);

export default function Buehne({ frage = null, buehneRef, children }) {
  const [ziel, setZiel] = useState(null);
  return (
    <div className="buehnen-spalte">
      <div className={`buehnen-kopf${frage ? ' mit-frage' : ''}`}>
        <div className="kopf-frage">{frage}</div>
        <div className="kopf-steuerung" ref={setZiel} />
      </div>
      <SteuerungsKontext.Provider value={ziel}>
        <div className="buehne" ref={buehneRef}>
          {children}
        </div>
      </SteuerungsKontext.Provider>
    </div>
  );
}
