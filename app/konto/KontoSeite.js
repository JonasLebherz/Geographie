'use client';
/**
 * app/konto/KontoSeite.js – Inhalt der Seite /konto (lib/konto.js)
 *
 * Kommt man über den Link „Passwort zurücksetzen“ (Supabase meldet PASSWORD_RECOVERY), steht
 * das Feld für das neue Passwort oben und ist hervorgehoben.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { abmelden, kontoLoeschen, passwortAendern, profilSpeichern, useKonto } from '@/lib/konto';
import { useT } from '@/lib/sprache';

const MIN_PASSWORT = 8;

function Meldung({ ergebnis }) {
  if (!ergebnis) return null;
  return (
    <p className={ergebnis.fehler ? 'fehler' : 'erfolg'} role={ergebnis.fehler ? 'alert' : 'status'}>
      {ergebnis.fehler ?? ergebnis.ok}
    </p>
  );
}

export default function KontoSeite() {
  const t = useT();
  const router = useRouter();
  const konto = useKonto();
  const [name, setName] = useState('');
  const [passwort, setPasswort] = useState('');
  const [nameErgebnis, setNameErgebnis] = useState(null);
  const [passwortErgebnis, setPasswortErgebnis] = useState(null);
  const [loeschenFragen, setLoeschenFragen] = useState(false);
  const [loeschErgebnis, setLoeschErgebnis] = useState(null);
  const zuruecksetzen = konto.ereignis === 'PASSWORD_RECOVERY';

  useEffect(() => {
    if (konto.profil?.name) setName(konto.profil.name);
  }, [konto.profil?.name]);

  if (!konto.bereit) return <div className="konto-seite" aria-busy="true" />;

  if (!konto.verfuegbar || !konto.nutzer) {
    return (
      <div className="konto-seite">
        <h1>{t('Konto')}</h1>
        <p className="hinweis">{konto.verfuegbar ? t('Nicht angemeldet') : t('Anmelden ist noch nicht eingerichtet.')}</p>
      </div>
    );
  }

  async function nameSpeichern(e) {
    e.preventDefault();
    const sauber = name.trim();
    if (!sauber) return setNameErgebnis({ fehler: t('Bitte einen Namen eingeben.') });
    const r = await profilSpeichern({ name: sauber.slice(0, 20) });
    setNameErgebnis(r.fehler ? { fehler: t(r.fehler) } : { ok: t('Gespeichert') });
  }

  async function passwortSpeichern(e) {
    e.preventDefault();
    if (passwort.length < MIN_PASSWORT) return setPasswortErgebnis({ fehler: t('Das Passwort braucht mindestens {n} Zeichen.', { n: MIN_PASSWORT }) });
    const r = await passwortAendern(passwort);
    setPasswort('');
    setPasswortErgebnis(r.fehler ? { fehler: t(r.fehler) } : { ok: t('Neues Passwort gespeichert') });
  }

  async function loeschen() {
    const r = await kontoLoeschen();
    if (r.fehler) return setLoeschErgebnis({ fehler: t(r.fehler) });
    router.push('/');
  }

  const passwortTeil = (
    <form className={`karte konto-teil${zuruecksetzen ? ' hervor' : ''}`} onSubmit={passwortSpeichern}>
      <h2>{zuruecksetzen ? t('Neues Passwort festlegen') : t('Passwort ändern')}</h2>
      <label className="feld">
        <span>{t('Neues Passwort')}</span>
        <input type="password" value={passwort} onChange={(e) => setPasswort(e.target.value)} autoComplete="new-password" required autoFocus={zuruecksetzen} />
      </label>
      <Meldung ergebnis={passwortErgebnis} />
      <button type="submit" className="knopf knopf-haupt">
        {t('Speichern')}
      </button>
    </form>
  );

  return (
    <div className="konto-seite">
      <h1>{t('Konto')}</h1>
      <p className="hinweis">{konto.nutzer.email}</p>

      {zuruecksetzen && passwortTeil}

      <form className="karte konto-teil" onSubmit={nameSpeichern}>
        <h2>{t('Name')}</h2>
        <label className="feld">
          <span className="unsichtbar">{t('Name')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoComplete="nickname" />
        </label>
        <Meldung ergebnis={nameErgebnis} />
        <button type="submit" className="knopf knopf-zweit">
          {t('Speichern')}
        </button>
      </form>

      {!zuruecksetzen && passwortTeil}

      <div className="karte konto-teil">
        <h2>{t('Abmelden')}</h2>
        <button
          type="button"
          className="knopf knopf-zweit"
          onClick={async () => {
            await abmelden();
            router.push('/');
          }}
        >
          {t('Abmelden')}
        </button>
      </div>

      <div className="karte konto-teil gefahr">
        <h2>{t('Konto löschen')}</h2>
        <p className="hinweis">{t('Profil, Figur und Bestwerte im Konto werden gelöscht. Einträge in der Bestenliste bleiben.')}</p>
        <Meldung ergebnis={loeschErgebnis} />
        {loeschenFragen ? (
          <div className="konto-knoepfe">
            <button type="button" className="knopf knopf-gefahr" onClick={loeschen}>
              {t('Endgültig löschen')}
            </button>
            <button type="button" className="knopf knopf-zweit" onClick={() => setLoeschenFragen(false)}>
              {t('Abbrechen')}
            </button>
          </div>
        ) : (
          <button type="button" className="knopf knopf-zweit" onClick={() => setLoeschenFragen(true)}>
            {t('Konto löschen')}
          </button>
        )}
      </div>
    </div>
  );
}
