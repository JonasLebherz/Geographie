'use client';
/**
 * components/karte/Frage.js – Inhalt der Frage-Kapsel über der Karte
 *
 * Meist ein Name („Bayern“, „Zugspitze“), darunter ggf. eine Zeile Fakten (Einwohner einer
 * Stadt, Höhe eines Gipfels, Beruf einer Person). Besondere Fragen:
 *  - 'flagge':      die Flagge des gesuchten Landes (public/flaggen/<kürzel>.svg)
 *  - 'kennzeichen': ein deutsches Nummernschild mit dem Kürzel des Kreises
 */
import { useT } from '@/lib/sprache';

/** Einwohnerzahl kurz: 1,5 Mio. bzw. 512.000 */
export function einwohner(t, ew) {
  if (ew >= 1e6) return t('{n} Mio. Einwohner', { n: (ew / 1e6).toLocaleString(t.sprache, { maximumFractionDigits: 1 }) });
  return t('{n} Einwohner', { n: t.zahl(Math.round(ew / 1000) * 1000) });
}

export default function Frage({ satz, einheit }) {
  const t = useT();
  if (!einheit) return <p className="frage-name">{' '}</p>;
  if (satz.frage === 'flagge') {
    return (
      <p className="frage-name frage-bild" key={einheit.id}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="frage-flagge" src={`/flaggen/${einheit.id.toLowerCase()}.svg`} alt={t('Flagge')} />
      </p>
    );
  }
  if (satz.frage === 'kennzeichen') {
    return (
      <p className="frage-name frage-bild" key={einheit.id}>
        <span className="kennzeichen" aria-label={t('Kennzeichen {kz}', { kz: einheit.kz })}>
          <span className="kz-eu" aria-hidden="true">
            D
          </span>
          <span className="kz-text">{einheit.kz}</span>
        </span>
      </p>
    );
  }
  const unter = einheit.ew ? einwohner(t, einheit.ew) : einheit.unter ? t.ortsname({ name: einheit.unter, en: einheit.unterEn }) : null;
  return (
    <>
      <p className="frage-name" key={einheit.id}>
        {t.ortsname(einheit)}
      </p>
      {unter && <p className="frage-info">{unter}</p>}
    </>
  );
}

/** „Weiß ich nicht“: überspringt die Frage – zählt als falsch, das Gesuchte wird gezeigt */
export function WeissNicht({ onKlick, gesperrt = false }) {
  const t = useT();
  return (
    <button type="button" className="weiss-nicht" onClick={onKlick} disabled={gesperrt}>
      {t('Weiß ich nicht')}
    </button>
  );
}
