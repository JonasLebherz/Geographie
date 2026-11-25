'use client';
/**
 * components/karte/Buehne.js – Bühne mit Kopfleiste: oben die Frage und die Kartenknöpfe,
 * darunter die Karte, auf der nichts liegt
 *
 * Wunsch: Im Quiz darf nichts die Karte verdecken (früher lagen Frage-Kapsel, Bild, Zoom und der
 * Schalter Karte/Satellit auf der Karte). Mit Frage trägt eine Kopfleiste über der Bühne links die
 * Frage (`frage`) und rechts die Kartenknöpfe. Beim Erkunden (ohne Frage) gibt es keine Leiste –
 * die Knöpfe liegen klein in der rechten oberen Kartenecke, damit Liste, Karte und rechte Leiste
 * oben bündig beginnen. Die Knöpfe gehören zur jeweils aktiven Kartenebene (KarteEbene) und
 * werden per Portal hineingesetzt (SteuerungsKontext).
 */
import { createContext, useState } from 'react';

/** DOM-Knoten in der Kopfleiste, in den die aktive Kartenebene ihre Knöpfe setzt */
export const SteuerungsKontext = createContext(null);

export default function Buehne({ frage = null, buehneRef, children }) {
  const [ziel, setZiel] = useState(null);
  return (
    <div className={`buehnen-spalte${frage ? ' mit-frage' : ''}`}>
      {frage && (
        <div className="buehnen-kopf mit-frage">
          <div className="kopf-frage">{frage}</div>
          <div className="kopf-steuerung" ref={setZiel} />
        </div>
      )}
      <SteuerungsKontext.Provider value={ziel}>
        <div className="buehne" ref={buehneRef}>
          {children}
          {!frage && <div className="buehne-steuerung" ref={setZiel} />}
        </div>
      </SteuerungsKontext.Provider>
    </div>
  );
}
