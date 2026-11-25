'use client';
/**
 * components/Anmeldung.js – Dialog zum Anmelden mit E-Mail und Passwort (lib/konto.js)
 *
 * Drei Ansichten: Anmelden, Konto erstellen (mit Name), Passwort vergessen (Link per Mail).
 * Nach dem Erstellen schickt Supabase meist erst eine Bestätigungs-Mail – das steht dann da.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { anmelden, passwortVergessen, registrieren } from '@/lib/konto';
import { useT } from '@/lib/sprache';

const MIN_PASSWORT = 8;

export default function Anmeldung({ onSchliessen }) {
  const t = useT();
  const dialog = useRef(null);
  const [art, setArt] = useState('anmelden'); // 'anmelden' | 'registrieren' | 'vergessen'
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [name, setName] = useState('');
  const [fehler, setFehler] = useState('');
  const [erfolg, setErfolg] = useState('');
  const [sendet, setSendet] = useState(false);

  useEffect(() => {
    dialog.current?.showModal?.();
    const d = dialog.current;
    const zu = () => onSchliessen();
    d?.addEventListener('close', zu);
    return () => d?.removeEventListener('close', zu);
  }, [onSchliessen]);

  const wechseln = (neu) => {
    setArt(neu);
    setFehler('');
    setErfolg('');
  };

  async function absenden(e) {
    e.preventDefault();
    setFehler('');
    setErfolg('');
    if (art !== 'vergessen' && passwort.length < MIN_PASSWORT) return setFehler(t('Das Passwort braucht mindestens {n} Zeichen.', { n: MIN_PASSWORT }));
    if (art === 'registrieren' && !name.trim()) return setFehler(t('Bitte einen Namen eingeben.'));
    setSendet(true);
    let ergebnis;
    if (art === 'anmelden') ergebnis = await anmelden(email, passwort);
    else if (art === 'registrieren') ergebnis = await registrieren(email, passwort, name.slice(0, 20));
    else ergebnis = await passwortVergessen(email);
    setSendet(false);
    if (ergebnis.fehler) return setFehler(t(ergebnis.fehler));
    if (art === 'vergessen') return setErfolg(t('Wir haben dir einen Link zum Zurücksetzen geschickt.'));
    if (ergebnis.bestaetigen) return setErfolg(t('Fast geschafft: Bitte bestätige deine E-Mail-Adresse über den Link in der Mail.'));
    dialog.current?.close();
  }

  const titel = { anmelden: t('Anmelden'), registrieren: t('Konto erstellen'), vergessen: t('Passwort vergessen') }[art];

  return (
    <dialog ref={dialog} className="anmeldung karte" aria-labelledby="anmeldung-titel" onClick={(e) => e.target === dialog.current && dialog.current.close()}>
      <form className="anmeldung-innen" onSubmit={absenden}>
        <h2 id="anmeldung-titel">{titel}</h2>
        {art !== 'vergessen' && (
          <div className="segment-schalter" role="tablist">
            {[
              ['anmelden', t('Anmelden')],
              ['registrieren', t('Konto erstellen')],
            ].map(([wert, text]) => (
              <button key={wert} type="button" role="tab" aria-selected={art === wert} className={art === wert ? 'gewaehlt' : undefined} onClick={() => wechseln(wert)}>
                {text}
              </button>
            ))}
          </div>
        )}
        {art === 'registrieren' && (
          <label className="feld">
            <span>{t('Name')}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoComplete="nickname" required />
          </label>
        )}
        <label className="feld">
          <span>{t('E-Mail')}</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus />
        </label>
        {art !== 'vergessen' && (
          <label className="feld">
            <span>{t('Passwort')}</span>
            <input
              type="password"
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              autoComplete={art === 'registrieren' ? 'new-password' : 'current-password'}
              required
            />
          </label>
        )}
        {fehler && (
          <p className="fehler" role="alert">
            {fehler}
          </p>
        )}
        {erfolg && (
          <p className="erfolg" role="status">
            {erfolg}
          </p>
        )}
        <button type="submit" className="knopf knopf-haupt knopf-breit" disabled={sendet}>
          {art === 'vergessen' ? t('Link schicken') : titel}
        </button>
        <div className="anmeldung-fuss">
          {art === 'anmelden' && (
            <button type="button" className="profil-link" onClick={() => wechseln('vergessen')}>
              {t('Passwort vergessen?')}
            </button>
          )}
          {art === 'vergessen' && (
            <button type="button" className="profil-link" onClick={() => wechseln('anmelden')}>
              {t('Zurück zum Anmelden')}
            </button>
          )}
          {art === 'registrieren' && (
            <small>
              <Link href="/datenschutz" target="_blank">
                {t('Datenschutz')}
              </Link>
            </small>
          )}
        </div>
      </form>
    </dialog>
  );
}
