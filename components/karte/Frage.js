'use client';
/**
 * components/karte/Frage.js – Inhalt der Frage-Leiste über der Karte
 *
 * Meist ein Name („Bayern“, „Zugspitze“), darunter ggf. eine Zeile Fakten (Einwohner einer
 * Stadt, Höhe eines Gipfels, Beruf einer Person). Besondere Fragen:
 *  - 'flagge':      die Flagge des gesuchten Landes (public/flaggen/<kürzel>.svg)
 *  - 'kennzeichen': ein deutsches Nummernschild mit dem Kürzel des Kreises
 * Bilder (Wikimedia Commons, mit Urheber und Lizenz): bei satz.bilder === 'frage' immer
 * (Sehenswürdigkeiten, Stadien, Gipfel, Essen, Personen), sonst nur nach einem Joker.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/lib/sprache';

/** Einwohnerzahl kurz: 1,5 Mio. bzw. 512.000 */
export function einwohner(t, ew) {
  if (ew >= 1e6) return t('{n} Mio. Einwohner', { n: (ew / 1e6).toLocaleString(t.sprache, { maximumFractionDigits: 1 }) });
  return t('{n} Einwohner', { n: t.zahl(Math.round(ew / 1000) * 1000) });
}

/** Adresse eines Bilds auf Wikimedia Commons in einer der festen Breiten (250, 500, 960 …) */
const commons = (datei, breite) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(datei)}?width=${breite}`;

/**
 * Bild von Wikimedia Commons als kleines Vorschaubild in der Frage-Leiste (nie über der Karte),
 * mit Urheber und Lizenz darunter. Antippen zeigt es groß, ein weiterer Klick oder Esc schließt.
 */
export function Foto({ bild }) {
  const t = useT();
  const [gross, setGross] = useState(false);
  useEffect(() => {
    if (!gross) return undefined;
    const taste = (e) => {
      if (e.key === 'Escape') setGross(false);
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, [gross]);
  const seite = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(bild.d)}`;
  const urheber = `${t('Foto')}: ${bild.a} · ${bild.l}`;
  return (
    <figure className="frage-foto">
      <button type="button" className="foto-vorschau" onClick={() => setGross(true)} aria-label={t('Bild vergrößern')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={commons(bild.d, 500)} alt="" loading="eager" referrerPolicy="no-referrer" />
      </button>
      <figcaption title={urheber}>
        <a href={seite} target="_blank" rel="noopener noreferrer">
          {urheber}
        </a>
      </figcaption>
      {gross &&
        createPortal(
          <div className="foto-gross" role="dialog" aria-modal="true" aria-label={t('Bild')} onClick={() => setGross(false)}>
            <figure onClick={(e) => e.target.tagName !== 'A' && setGross(false)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={commons(bild.d, 960)} alt="" referrerPolicy="no-referrer" />
              <figcaption>
                <a href={seite} target="_blank" rel="noopener noreferrer">
                  {urheber}
                </a>
              </figcaption>
            </figure>
          </div>,
          document.body,
        )}
    </figure>
  );
}

export default function Frage({ satz, einheit, joker = false }) {
  const t = useT();
  if (!einheit)
    return (
      <div className="frage-text">
        <p className="frage-name">{'\u00a0'}</p>
      </div>
    );
  const foto = einheit.bild && (satz.bilder === 'frage' || joker) ? <Foto bild={einheit.bild} /> : null;
  if (satz.frage === 'flagge') {
    return (
      <>
      {foto}
      <div className="frage-text">
        <p className="frage-name frage-bild" key={einheit.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="frage-flagge" src={`/flaggen/${einheit.id.toLowerCase()}.svg`} alt={t('Flagge')} />
        </p>
      </div>
      </>
    );
  }
  if (satz.frage === 'kennzeichen') {
    return (
      <>
      {foto}
      <div className="frage-text">
        <p className="frage-name frage-bild" key={einheit.id}>
          <span className="kennzeichen" aria-label={t('Kennzeichen {kz}', { kz: einheit.kz })}>
            <span className="kz-eu" aria-hidden="true">
              D
            </span>
            <span className="kz-text">{einheit.kz}</span>
          </span>
        </p>
      </div>
      </>
    );
  }
  const unter = einheit.ew ? einwohner(t, einheit.ew) : einheit.unter ? t.ortsname({ name: einheit.unter, en: einheit.unterEn }) : null;
  return (
    <>
      {foto}
      <div className="frage-text">
        <p className={`frage-name${t.ortsname(einheit).length > 30 ? ' lang' : ''}`} key={einheit.id}>
          {t.ortsname(einheit)}
        </p>
        {unter && <p className="frage-info">{unter}</p>}
      </div>
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

/** Joker-Knopf: zeigt das Bild als Hinweis (Treffer zählt dann höchstens gelb) */
export function JokerKnopf({ rest, onKlick, gesperrt = false }) {
  const t = useT();
  return (
    <button type="button" className="joker-knopf" onClick={onKlick} disabled={gesperrt || rest <= 0} title={t('Joker: Bild als Hinweis')}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
      </svg>
      {t('Joker')}
      <span className="joker-zahl">{rest}</span>
    </button>
  );
}
