'use client';
/**
 * components/ProfilMenue.js – Profil-Knopf oben rechts mit Einstellungen
 *
 * Oben das Profil mit der eigenen Comic-Figur (Avatar, components/AvatarEditor.js) und dem Konto:
 * Anmelden mit E-Mail und Passwort (components/Anmeldung.js, lib/konto.js), angemeldet Name,
 * E-Mail, „Konto“ (Seite /konto) und „Abmelden“. Ohne eingerichtetes Supabase bleibt der Knopf gesperrt.
 * Darunter die Einstellungen – sie gelten sofort und bleiben in diesem Browser gespeichert
 * (lib/einstellungen.js):
 *   Stil (Comic, Atlas, Seekarte), Darstellung (Hell, Dunkel, Automatisch – die Seekarte gibt es
 *   nur hell), Töne an/aus, Lautstärke, Sprache.
 *
 * Bedienung wie ein Menü: Klick daneben oder Esc schließt es, der Fokus geht zurück auf den Knopf.
 * Beim Loslassen des Lautstärke-Reglers erklingt ein Probeton.
 */
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useEinstellung } from '@/lib/einstellungen';
import { abmelden, useKonto } from '@/lib/konto';
import { useT } from '@/lib/sprache';
import { klang } from '@/lib/ton';
import { Person } from './Symbole';
import Avatar from './Avatar';
import AvatarEditor from './AvatarEditor';
import Anmeldung from './Anmeldung';

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
  const [avatar] = useEinstellung('avatar');
  const [editor, setEditor] = useState(false);
  const [anmeldung, setAnmeldung] = useState(false);
  const konto = useKonto();
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
        {avatar ? <Avatar wert={avatar} groesse={34} /> : <Person />}
      </button>
      {editor && <AvatarEditor onSchliessen={() => setEditor(false)} />}
      {anmeldung && <Anmeldung onSchliessen={() => setAnmeldung(false)} />}

      {offen && (
        <div className="profil-menue" id={menueId} role="dialog" aria-label={t('Profil und Einstellungen')}>
          <div className="profil-kopf">
            <button
              type="button"
              className="avatar avatar-knopf"
              onClick={() => {
                setEditor(true);
                setOffen(false);
              }}
              aria-label={t('Avatar bearbeiten')}
              title={t('Avatar bearbeiten')}
            >
              {avatar ? <Avatar wert={avatar} groesse={44} /> : <Person />}
            </button>
            <div>
              <strong>{konto.nutzer ? konto.profil?.name || t('Angemeldet') : t('Gast')}</strong>
              <small>{konto.nutzer ? konto.nutzer.email : t('Nicht angemeldet')}</small>
              <button
                type="button"
                className="profil-link"
                onClick={() => {
                  setEditor(true);
                  setOffen(false);
                }}
              >
                {avatar ? t('Avatar bearbeiten') : t('Avatar erstellen')}
              </button>
            </div>
          </div>
          {konto.nutzer ? (
            <div className="konto-knoepfe">
              <Link href="/konto" className="knopf knopf-zweit" onClick={() => setOffen(false)}>
                {t('Konto')}
              </Link>
              <button type="button" className="knopf knopf-zweit" onClick={() => abmelden()}>
                {t('Abmelden')}
              </button>
            </div>
          ) : null}
          {konto.nutzer && konto.admin ? (
            <Link href="/statistik" className="knopf knopf-haupt knopf-breit statistik-link" onClick={() => setOffen(false)}>
              {t('Statistik')}
            </Link>
          ) : null}
          {konto.nutzer ? null : (
            <>
              <button
                type="button"
                className="knopf knopf-zweit knopf-breit"
                disabled={!konto.verfuegbar}
                onClick={() => {
                  setAnmeldung(true);
                  setOffen(false);
                }}
              >
                {t('Anmelden')}
              </button>
              <p className="profil-vermerk">
                {konto.verfuegbar ? t('Mit Konto sind Figur und Bestwerte auf jedem Gerät da.') : t('Anmelden ist noch nicht eingerichtet.')}
              </p>
            </>
          )}

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
