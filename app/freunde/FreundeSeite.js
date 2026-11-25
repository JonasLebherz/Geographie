'use client';
/**
 * app/freunde/FreundeSeite.js – Freunde: eigener Einladungslink, Freundesliste, zur Party einladen
 *
 * Freunde gibt es nur mit Konto (lib/freunde.js, Supabase). Ohne Konto: eigene Figur und
 * „Anmelden“. Kommt man über einen Einladungslink (?von=<Konto>), steht oben, wer einen
 * einlädt, mit „Hinzufügen“ – danach ist man befreundet.
 * Einladen: „Einladen“ beim Freund legt beim ersten Mal eine Lobby an, schickt die Einladung und
 * merkt sich die Lobby – weitere Freunde landen in derselben. „Zur Lobby“ öffnet sie.
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Avatar, { avatarAus } from '@/components/Avatar';
import Anmeldung from '@/components/Anmeldung';
import { Freunde as FreundeSymbol, Kette } from '@/components/Symbole';
import { useEinstellung } from '@/lib/einstellungen';
import { useKonto } from '@/lib/konto';
import { einladen, einladungslink, freundEntfernen, freundeLaden, freundHinzufuegen, profilOeffentlich } from '@/lib/freunde';
import { neuerCode } from '@/lib/party/codes';
import { GASTGEBER } from '@/app/party/PartyStart';
import { useT } from '@/lib/sprache';

const KENNUNG = /^[0-9a-f-]{36}$/i;

/** Lobby anlegen (man selbst ist Gastgeber) – Code zurück */
function lobbyAnlegen() {
  const code = neuerCode();
  try {
    sessionStorage.setItem(GASTGEBER(code), '1');
  } catch {
    /* ohne Speicher ist man eben Gast */
  }
  return code;
}

export default function FreundeSeite() {
  const t = useT();
  const router = useRouter();
  const suche = useSearchParams();
  const konto = useKonto();
  const [figur] = useEinstellung('avatar');
  const [freunde, setFreunde] = useState(null);
  const [anfrage, setAnfrage] = useState(null); // { id, name, avatar } aus ?von=
  const [lobby, setLobby] = useState(null);
  const [eingeladen, setEingeladen] = useState({});
  const [entfernen, setEntfernen] = useState(null);
  const [kopiert, setKopiert] = useState(false);
  const [anmeldung, setAnmeldung] = useState(false);
  const [fehler, setFehler] = useState('');
  const nutzerId = konto.nutzer?.id;
  const von = suche.get('von');

  const laden = useCallback(async () => {
    const { freunde: liste } = await freundeLaden();
    setFreunde(liste);
  }, []);

  useEffect(() => {
    if (nutzerId) laden();
    else setFreunde(null);
  }, [nutzerId, laden]);

  // Einladungslink eines anderen geöffnet: wer ist das?
  useEffect(() => {
    if (!von || !KENNUNG.test(von) || !konto.verfuegbar || von === nutzerId) {
      setAnfrage(null);
      return;
    }
    profilOeffentlich(von).then(({ profil }) => setAnfrage(profil ? { ...profil, id: von } : null));
  }, [von, nutzerId, konto.verfuegbar]);

  const schonFreund = anfrage && freunde?.some((f) => f.id === anfrage.id);

  async function annehmen() {
    const r = await freundHinzufuegen(anfrage.id);
    if (r.fehler) return setFehler(t(r.fehler));
    await laden();
    router.replace('/freunde');
  }

  async function freundEinladen(f) {
    setFehler('');
    const code = lobby ?? lobbyAnlegen();
    setLobby(code);
    const r = await einladen(f.id, code);
    if (r.fehler) return setFehler(t(r.fehler));
    setEingeladen((e) => ({ ...e, [f.id]: true }));
  }

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(einladungslink(nutzerId));
      setKopiert(true);
      setTimeout(() => setKopiert(false), 1600);
    } catch {
      /* Zwischenablage gesperrt */
    }
  }

  const name = konto.profil?.name || t('Du');

  return (
    <div className="freunde">
      {anmeldung && <Anmeldung onSchliessen={() => setAnmeldung(false)} />}
      <header className="freunde-kopf">
        <h1>{t('Freunde')}</h1>
        {freunde && <span className="freunde-zahl">{freunde.length === 1 ? t('1 Freund') : t('{n} Freunde', { n: freunde.length })}</span>}
      </header>

      {anfrage && !schonFreund && (
        <section className="karte anfrage">
          <Avatar wert={anfrage.avatar || avatarAus(anfrage.id)} groesse={56} pose="daumen" />
          <div>
            <strong>{anfrage.name ?? t('Ein Freund')}</strong>
            <span>{t('möchte mit dir befreundet sein')}</span>
          </div>
          {nutzerId ? (
            <button type="button" className="knopf knopf-haupt" onClick={annehmen}>
              {t('Hinzufügen')}
            </button>
          ) : (
            <button type="button" className="knopf knopf-haupt" onClick={() => setAnmeldung(true)} disabled={!konto.verfuegbar}>
              {t('Anmelden')}
            </button>
          )}
        </section>
      )}

      {fehler && (
        <p className="fehler" role="alert">
          {fehler}
        </p>
      )}

      <div className="freunde-raster">
        <aside className="freunde-spalte">
          <section className="karte ich-karte">
            <Avatar wert={figur || avatarAus(name)} groesse={56} />
            <div>
              <strong>{name}</strong>
              <small>{konto.nutzer ? konto.nutzer.email : t('Nicht angemeldet')}</small>
            </div>
          </section>

          {nutzerId ? (
            <section className="karte einladen">
              <h2>
                <FreundeSymbol />
                {t('Freund einladen')}
              </h2>
              <div className="einladen-link">
                <code>{einladungslink(nutzerId)}</code>
                <button type="button" className="knopf knopf-zweit" onClick={kopieren}>
                  <Kette />
                  {kopiert ? t('Kopiert') : t('Kopieren')}
                </button>
              </div>
            </section>
          ) : (
            <section className="karte einladen">
              <h2>
                <FreundeSymbol />
                {t('Freunde gibt es mit Konto')}
              </h2>
              <button type="button" className="knopf knopf-haupt" onClick={() => setAnmeldung(true)} disabled={!konto.verfuegbar}>
                {t('Anmelden')}
              </button>
            </section>
          )}
        </aside>

        <section className="karte freundesliste">
          <div className="freundesliste-kopf">
            <h2>{t('Deine Freunde')}</h2>
            {lobby && (
              <button type="button" className="knopf knopf-haupt" onClick={() => router.push(`/party/${lobby}`)}>
                {t('Zur Lobby')}
              </button>
            )}
          </div>
          {!nutzerId || (freunde && !freunde.length) ? (
            <p className="hinweis">{t('Noch keine Freunde')}</p>
          ) : !freunde ? (
            <div className="statistik-laedt klein" aria-busy="true" />
          ) : (
            <ul>
              {freunde.map((f) => (
                <li key={f.id} className="freund">
                  <Avatar wert={f.avatar || avatarAus(f.id)} groesse={44} />
                  <strong className="freund-name">{f.name ?? '–'}</strong>
                  {entfernen === f.id ? (
                    <span className="freund-knoepfe">
                      <button
                        type="button"
                        className="knopf knopf-gefahr"
                        onClick={async () => {
                          await freundEntfernen(f.id);
                          setEntfernen(null);
                          laden();
                        }}
                      >
                        {t('Entfernen')}
                      </button>
                      <button type="button" className="knopf knopf-zweit" onClick={() => setEntfernen(null)}>
                        {t('Abbrechen')}
                      </button>
                    </span>
                  ) : (
                    <span className="freund-knoepfe">
                      <button type="button" className="knopf knopf-haupt" onClick={() => freundEinladen(f)} disabled={eingeladen[f.id]}>
                        {eingeladen[f.id] ? t('Eingeladen') : t('Zur Party einladen')}
                      </button>
                      <button type="button" className="knopf knopf-zweit freund-weg" onClick={() => setEntfernen(f.id)} aria-label={t('Entfernen')} title={t('Entfernen')}>
                        ×
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
