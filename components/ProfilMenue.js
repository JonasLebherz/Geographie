'use client';
/**
 * components/ProfilMenue.js – Profil-Knopf oben rechts mit Einstellungen
 *
 * Oben das Profil: Anmelden gibt es noch nicht (Knopf gesperrt, kurzer Vermerk).
 * Darunter die Einstellungen – sie gelten sofort und bleiben in diesem Browser gespeichert
 * (lib/einstellungen.js):
 *   Stil (Comic, Atlas, Seekarte), Darstellung (Hell, Dunkel, Automatisch – die Seekarte gibt es
 *   nur hell), Töne an/aus, Lautstärke, Sprache.
 *
 * Bedienung wie ein Menü: Klick daneben oder Esc schließt es, der Fokus geht zurück auf den Knopf.
 * Beim Loslassen des Lautstärke-Reglers erklingt ein Probeton.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { useEinstellung } from '@/lib/einstellungen';
import { useT } from '@/lib/sprache';
import { klang } from '@/lib/ton';
import { Person } from './Symbole';

/** Segment-Schalter (wie bei Apple): eine Auswahl aus wenigen Möglichkeiten */
function Segmente({ titel, wert, optionen, onWahl }) {
  return (
    <div className="segment-schalter" role="radiogroup" aria-label={titel}>
      {optionen.map((o) => (
        <button
          key={o.wert}
          type="button"
          role="radio"
          aria-checked={wert === o.wert}
          className={wert === o.wert ? 'gewaehlt' : undefined}
          onClick={() => onWahl(o.wert)}
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}

export default function ProfilMenue() {
  const t = useT();
  const [offen, setOffen] = useState(false);
  const [darstellung, setDarstellung] = useEinstellung('darstellung');
  const [ton, setTon] = useEinstellung('ton');
  const [lautstaerke, setLautstaerke] = useEinstellung('lautstaerke');
  const [sprache, setSprache] = useEinstellung('sprache');
  const [stil, setStil] = useEinstellung('stil');
  const huelle = useRef(null);
  const knopf = useRef(null);
  const menueId = useId();
  const reglerId = useId();

  // Schließen bei Klick daneben oder Esc
  useEffect(() => {
    if (!offen) return;
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

  const tonAn = ton !== 'aus';

  return (
    <div className="profil" ref={huelle}>
      <button
        ref={knopf}
        type="button"
        className="profil-knopf"
        aria-expanded={offen}
        aria-controls={menueId}
        aria-label={t('Profil und Einstellungen')}
        title={t('Profil und Einstellungen')}
        onClick={() => setOffen((o) => !o)}
      >
        <Person />
      </button>

      {offen && (
        <div className="profil-menue" id={menueId} role="dialog" aria-label={t('Profil und Einstellungen')}>
          <div className="profil-kopf">
            <span className="avatar" aria-hidden="true">
              <Person />
            </span>
            <div>
              <strong>{t('Gast')}</strong>
              <small>{t('Nicht angemeldet')}</small>
            </div>
          </div>
          <button type="button" className="knopf knopf-zweit knopf-breit" disabled>
            {t('Anmelden')}
          </button>
          <p className="profil-vermerk">{t('Anmelden ist noch nicht verfügbar.')}</p>

          <div className="einstellungen">
            <div className="einstellung">
              <span className="einstellung-titel">{t('Stil')}</span>
              <Segmente
                titel={t('Stil')}
                wert={stil}
                onWahl={setStil}
                optionen={[
                  { wert: 'comic', text: t('Comic') },
                  { wert: 'atlas', text: t('Atlas') },
                  { wert: 'seekarte', text: t('Seekarte') },
                ]}
              />
            </div>

            <div className={`einstellung${stil === 'seekarte' ? ' gesperrt' : ''}`}>
              <span className="einstellung-titel">{t('Darstellung')}</span>
              <Segmente
                titel={t('Darstellung')}
                wert={darstellung}
                onWahl={setDarstellung}
                optionen={[
                  { wert: 'hell', text: t('Hell') },
                  { wert: 'dunkel', text: t('Dunkel') },
                  { wert: 'auto', text: t('Automatisch') },
                ]}
              />
            </div>

            <div className="einstellung zeile">
              <span className="einstellung-titel" id={`${reglerId}-ton`}>
                {t('Töne')}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={tonAn}
                aria-labelledby={`${reglerId}-ton`}
                className="schalter"
                onClick={() => setTon(tonAn ? 'aus' : 'an')}
              >
                <span />
              </button>
            </div>

            <div className={`einstellung${tonAn ? '' : ' gesperrt'}`}>
              <label className="einstellung-titel" htmlFor={reglerId}>
                {t('Lautstärke')}
                <span className="wert">{Math.round(lautstaerke * 100)} %</span>
              </label>
              <input
                id={reglerId}
                type="range"
                className="regler"
                min="0"
                max="100"
                step="5"
                disabled={!tonAn}
                value={Math.round(lautstaerke * 100)}
                style={{ '--anteil': `${lautstaerke * 100}%` }}
                onChange={(e) => setLautstaerke(Number(e.target.value) / 100)}
                onPointerUp={() => klang('richtig')}
                onKeyUp={(e) => e.key.startsWith('Arrow') && klang('richtig')}
              />
            </div>

            <div className="einstellung">
              <span className="einstellung-titel">{t('Sprache')}</span>
              <Segmente
                titel={t('Sprache')}
                wert={sprache}
                onWahl={setSprache}
                optionen={[
                  { wert: 'de', text: 'Deutsch' },
                  { wert: 'en', text: 'English' },
                ]}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
