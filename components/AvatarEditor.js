'use client';
/**
 * components/AvatarEditor.js – eigene Comic-Figur zusammenstellen (aus dem Profil-Menü)
 *
 * Großes Vorschaubild, daneben der Jubel. Je Teil Pfeile zum Durchblättern, bei Farben eine
 * Reihe Farbfelder. „Zufall“ würfelt alles neu. Jede Änderung wird sofort gespeichert
 * (Einstellung `avatar`) und in einer Party den anderen gezeigt.
 */
import { useEffect, useRef } from 'react';
import Avatar, { AVATAR_TEILE, avatarAus, avatarLesen, avatarText } from './Avatar';
import { useEinstellung } from '@/lib/einstellungen';
import { useT } from '@/lib/sprache';
import { Chevron } from './Symbole';

export default function AvatarEditor({ onSchliessen }) {
  const t = useT();
  const [wert, setWert] = useEinstellung('avatar');
  const aktuell = avatarLesen(wert || avatarAus('neu'));
  const dialog = useRef(null);

  useEffect(() => {
    dialog.current?.showModal?.();
    const d = dialog.current;
    const zu = () => onSchliessen();
    d?.addEventListener('close', zu);
    return () => d?.removeEventListener('close', zu);
  }, [onSchliessen]);

  const setze = (name, w) => setWert(avatarText({ ...aktuell, [name]: w }));
  const blaettern = (teil, schritt) => setze(teil.name, (aktuell[teil.name] + schritt + teil.anzahl) % teil.anzahl);

  return (
    <dialog ref={dialog} className="avatar-editor karte" aria-labelledby="avatar-titel" onClick={(e) => e.target === dialog.current && dialog.current.close()}>
      <div className="avatar-editor-innen">
        <h2 id="avatar-titel">{t('Dein Avatar')}</h2>
        <div className="avatar-vorschau">
          <Avatar wert={avatarText(aktuell)} groesse={140} />
          <Avatar wert={avatarText(aktuell)} groesse={84} pose="jubel" className="jubel-vorschau" />
        </div>
        <div className="avatar-teile">
          {AVATAR_TEILE.map((teil) => (
            <div key={teil.name} className="avatar-teil">
              <span className="avatar-teil-titel">{t(teil.titel)}</span>
              {teil.farbe ? (
                <div className="farbfelder" role="radiogroup" aria-label={t(teil.titel)}>
                  {teil.farbe.map((farbe, i) => (
                    <button
                      key={farbe}
                      type="button"
                      role="radio"
                      aria-checked={aktuell[teil.name] === i}
                      aria-label={`${t(teil.titel)} ${i + 1}`}
                      className={aktuell[teil.name] === i ? 'gewaehlt' : undefined}
                      style={{ '--farbe': farbe }}
                      onClick={() => setze(teil.name, i)}
                    />
                  ))}
                </div>
              ) : (
                <div className="blaettern">
                  <button type="button" onClick={() => blaettern(teil, -1)} aria-label={t('{teil}: vorherige', { teil: t(teil.titel) })}>
                    <Chevron richtung="links" />
                  </button>
                  <span className="blaettern-zahl">
                    {aktuell[teil.name] + 1} / {teil.anzahl}
                  </span>
                  <button type="button" onClick={() => blaettern(teil, 1)} aria-label={t('{teil}: nächste', { teil: t(teil.titel) })}>
                    <Chevron />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="ergebnis-knoepfe">
          <button type="button" className="knopf knopf-zweit" onClick={() => setWert(avatarAus(String(Date.now())))}>
            {t('Zufall')}
          </button>
          <button type="button" className="knopf knopf-haupt" onClick={() => dialog.current?.close()}>
            {t('Fertig')}
          </button>
        </div>
      </div>
    </dialog>
  );
}
