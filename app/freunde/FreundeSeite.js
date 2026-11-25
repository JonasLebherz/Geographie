'use client';
/**
 * app/freunde/FreundeSeite.js – Vorschau des Freunde-Bereichs (Wunsch: „testweise, ohne Supabase“)
 *
 * Links die Freundesliste mit Comic-Figur, Status und was gerade gespielt wird, darüber „Freund
 * einladen“ (eigener Einladungslink zum Kopieren). Rechts der Chat mit dem gewählten Freund und
 * „Zur Party einladen“ (legt eine Lobby an und schreibt den Link in den Chat).
 * Alles ist Beispiel bzw. bleibt nur in diesem Browser (State, nichts gespeichert, nichts gesendet).
 * Später: Freunde und Nachrichten in Supabase (Tabellen + Realtime wie bei der Party).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import { Freunde as FreundeSymbol, Kette, Sprechblase } from '@/components/Symbole';
import { useEinstellung } from '@/lib/einstellungen';
import { useKonto } from '@/lib/konto';
import { neuerCode } from '@/lib/party/codes';
import { GASTGEBER } from '@/app/party/PartyStart';
import { useT } from '@/lib/sprache';

/** Beispiel-Freunde für die Vorschau */
const BEISPIELE = [
  { id: 'mia', name: 'Mia', avatar: '2.2.3.1.0.1.5.1', status: 'spielt', was: { de: 'Europa · Länder', en: 'Europe · Countries' } },
  { id: 'ben', name: 'Ben', avatar: '4.3.0.2.1.0.2.3', status: 'online' },
  { id: 'lea', name: 'Lea', avatar: '0.4.4.0.2.2.0.5', status: 'spielt', was: { de: 'Am nächsten dran · Allgemeinwissen', en: 'Closest wins · General knowledge' } },
  { id: 'tom', name: 'Tom', avatar: '3.1.2.3.0.3.4.4', status: 'offline', zuletzt: { de: 'gestern', en: 'yesterday' } },
];

const ANFANG = {
  mia: [
    { von: 'mia', de: 'Hast du schon das neue Wissensquiz probiert?', en: 'Have you tried the new knowledge quiz yet?' },
    { von: 'ich', de: 'Noch nicht – gleich!', en: 'Not yet – soon!' },
    { von: 'mia', de: 'Ich hab 9 von 10.', en: 'I got 9 out of 10.' },
  ],
  ben: [{ von: 'ben', de: 'Revanche bei den Hauptstädten?', en: 'Rematch on capitals?' }],
  lea: [],
  tom: [{ von: 'tom', de: 'Bayern-Kreise sind echt schwer.', en: 'The Bavarian districts are really hard.' }],
};

export default function FreundeSeite() {
  const t = useT();
  const router = useRouter();
  const konto = useKonto();
  const [eigeneFigur] = useEinstellung('avatar');
  const [gewaehlt, setGewaehlt] = useState('mia');
  const [verlaeufe, setVerlaeufe] = useState(ANFANG);
  const [eingabe, setEingabe] = useState('');
  const [kopiert, setKopiert] = useState(false);
  const [link, setLink] = useState('');
  const listeRef = useRef(null);
  const freund = BEISPIELE.find((f) => f.id === gewaehlt);
  const nachrichten = verlaeufe[gewaehlt] ?? [];
  const text = (n) => (t.sprache === 'en' ? n.en ?? n.de : n.de);

  // Eigener Einladungslink (Vorschau: zufälliger Code, erst im Browser – sonst Hydration-Fehler)
  useEffect(() => {
    setLink(`${window.location.origin}/freunde?von=${neuerCode()}`);
  }, []);

  useEffect(() => {
    listeRef.current?.scrollTo({ top: listeRef.current.scrollHeight });
  }, [gewaehlt, nachrichten.length]);

  const online = useMemo(() => BEISPIELE.filter((f) => f.status !== 'offline').length, []);

  function senden(e) {
    e.preventDefault();
    const sauber = eingabe.trim();
    if (!sauber) return;
    setVerlaeufe((v) => ({ ...v, [gewaehlt]: [...(v[gewaehlt] ?? []), { von: 'ich', de: sauber, en: sauber }] }));
    setEingabe('');
  }

  function zurParty() {
    const code = neuerCode();
    try {
      sessionStorage.setItem(GASTGEBER(code), '1');
    } catch {
      /* ohne Speicher ist man eben Gast */
    }
    const ziel = `/party/${code}`;
    setVerlaeufe((v) => ({
      ...v,
      [gewaehlt]: [...(v[gewaehlt] ?? []), { von: 'ich', party: ziel }],
    }));
  }

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(link);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 1600);
    } catch {
      /* Zwischenablage gesperrt */
    }
  }

  const statusText = (f) =>
    f.status === 'spielt' ? t('spielt {was}', { was: text(f.was) }) : f.status === 'online' ? t('online') : t('zuletzt {wann}', { wann: text(f.zuletzt) });

  return (
    <div className="freunde">
      <header className="freunde-kopf">
        <h1>{t('Freunde')}</h1>
        <span className="vorschau-marke">{t('Vorschau')}</span>
        <span className="freunde-zahl">{t('{n} von {m} online', { n: online, m: BEISPIELE.length })}</span>
      </header>

      <div className="freunde-raster">
        <aside className="freunde-spalte">
          <section className="karte einladen">
            <h2>
              <FreundeSymbol />
              {t('Freund einladen')}
            </h2>
            <div className="einladen-link">
              <code>{link || '…'}</code>
              <button type="button" className="knopf knopf-zweit" onClick={kopieren} disabled={!link}>
                <Kette />
                {kopiert ? t('Kopiert') : t('Kopieren')}
              </button>
            </div>
          </section>

          <ul className="freundesliste karte" aria-label={t('Freunde')}>
            {BEISPIELE.map((f) => (
              <li key={f.id}>
                <button type="button" className={`freund${f.id === gewaehlt ? ' gewaehlt' : ''}`} onClick={() => setGewaehlt(f.id)} aria-pressed={f.id === gewaehlt}>
                  <span className="freund-figur">
                    <Avatar wert={f.avatar} groesse={44} />
                    <i className={`status-punkt ${f.status}`} aria-hidden="true" />
                  </span>
                  <span className="freund-text">
                    <strong>{f.name}</strong>
                    <small>{statusText(f)}</small>
                  </span>
                  {(verlaeufe[f.id] ?? []).length > 0 && f.id !== gewaehlt && <span className="ungelesen">{(verlaeufe[f.id] ?? []).length}</span>}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="chat karte" aria-label={t('Chat mit {name}', { name: freund.name })}>
          <header className="chat-kopf">
            <Avatar wert={freund.avatar} groesse={40} />
            <div>
              <strong>{freund.name}</strong>
              <small>{statusText(freund)}</small>
            </div>
            <button type="button" className="knopf knopf-haupt" onClick={zurParty}>
              {t('Zur Party einladen')}
            </button>
          </header>
          <ol className="chat-verlauf" ref={listeRef}>
            {!nachrichten.length && (
              <li className="chat-leer">
                <Sprechblase />
                {t('Noch keine Nachrichten')}
              </li>
            )}
            {nachrichten.map((n, i) => (
              <li key={i} className={`nachricht ${n.von === 'ich' ? 'eigene' : 'fremde'}`}>
                {n.von !== 'ich' && <Avatar wert={freund.avatar} groesse={28} />}
                <span className="blase">
                  {n.party ? (
                    <>
                      {t('Komm in meine Party!')}{' '}
                      <button type="button" className="profil-link" onClick={() => router.push(n.party)}>
                        {t('Zur Lobby')}
                      </button>
                    </>
                  ) : (
                    text(n)
                  )}
                </span>
                {n.von === 'ich' && (konto.nutzer || eigeneFigur ? <Avatar wert={eigeneFigur || '1.1.1.0.0.0.0.0'} groesse={28} /> : null)}
              </li>
            ))}
          </ol>
          <form className="chat-eingabe" onSubmit={senden}>
            <input value={eingabe} onChange={(e) => setEingabe(e.target.value)} placeholder={t('Nachricht an {name}', { name: freund.name })} aria-label={t('Nachricht')} maxLength={300} />
            <button type="submit" className="knopf knopf-haupt" disabled={!eingabe.trim()}>
              {t('Senden')}
            </button>
          </form>
          <p className="chat-vermerk">{t('Vorschau: Nachrichten bleiben auf diesem Gerät.')}</p>
        </section>
      </div>
    </div>
  );
}
