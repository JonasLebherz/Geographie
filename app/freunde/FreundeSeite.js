'use client';
/**
 * app/freunde/FreundeSeite.js – Freunde-Bereich (Vorschau, noch ohne Datenbank)
 *
 * Wunsch: keine erfundenen Beispiel-Freunde oder -Nachrichten. Gezeigt wird nur, was wirklich
 * geht: die eigene Figur, der eigene Einladungslink zum Kopieren, „Party starten“ (legt eine
 * Lobby an und öffnet sie) und die – noch leere – Freundesliste mit leerem Chat.
 * Später: Freunde, Anfragen und Nachrichten in Supabase (Tabellen + Realtime wie bei der Party),
 * dann auch Zähler für ungelesene Nachrichten (gelesen = beim Öffnen des Chats).
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar, { avatarAus } from '@/components/Avatar';
import { Freunde as FreundeSymbol, Kette, Sprechblase } from '@/components/Symbole';
import { useEinstellung } from '@/lib/einstellungen';
import { useKonto } from '@/lib/konto';
import { neuerCode } from '@/lib/party/codes';
import { GASTGEBER } from '@/app/party/PartyStart';
import { useT } from '@/lib/sprache';

export default function FreundeSeite() {
  const t = useT();
  const router = useRouter();
  const konto = useKonto();
  const [figur] = useEinstellung('avatar');
  const [kopiert, setKopiert] = useState(false);
  const [link, setLink] = useState('');

  // Eigener Einladungslink (erst im Browser – sonst Hydration-Fehler)
  useEffect(() => {
    setLink(`${window.location.origin}/freunde?von=${neuerCode()}`);
  }, []);

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(link);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 1600);
    } catch {
      /* Zwischenablage gesperrt */
    }
  }

  function partyStarten() {
    const code = neuerCode();
    try {
      sessionStorage.setItem(GASTGEBER(code), '1');
    } catch {
      /* ohne Speicher ist man eben Gast */
    }
    router.push(`/party/${code}`);
  }

  const name = konto.profil?.name || t('Du');

  return (
    <div className="freunde">
      <header className="freunde-kopf">
        <h1>{t('Freunde')}</h1>
        <span className="vorschau-marke">{t('Vorschau')}</span>
      </header>

      <div className="freunde-raster">
        <aside className="freunde-spalte">
          <section className="karte ich-karte">
            <Avatar wert={figur || avatarAus(name)} groesse={56} />
            <div>
              <strong>{name}</strong>
              <small>{konto.nutzer ? konto.nutzer.email : t('Nicht angemeldet')}</small>
            </div>
          </section>

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

          <section className="karte freundesliste leer">
            <h2>{t('Deine Freunde')}</h2>
            <p className="hinweis">{t('Noch keine Freunde')}</p>
          </section>
        </aside>

        <section className="chat karte" aria-label={t('Chat')}>
          <div className="chat-leer-gross">
            <Sprechblase />
            <strong>{t('Noch keine Nachrichten')}</strong>
            <button type="button" className="knopf knopf-haupt" onClick={partyStarten}>
              {t('Party starten')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
