'use client';
/**
 * components/Einladungen.js – Party-Einladungen von Freunden, auf jeder Seite (app/layout.js)
 *
 * Nur angemeldet: offene Einladungen laden, neue sofort über Realtime, zur Sicherheit alle 30 s
 * nachsehen (wenn das Fenster sichtbar ist). Je Einladung eine kleine Karte unten rechts mit der
 * Figur des Freundes, „Beitreten“ und „Später“ – beides markiert sie als gesehen.
 * Wer gerade in genau dieser Lobby ist, bekommt keine Karte.
 */
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Avatar, { avatarAus } from './Avatar';
import { useKonto } from '@/lib/konto';
import { einladungenAbonnieren, einladungenLaden, einladungGesehen } from '@/lib/freunde';
import { klang } from '@/lib/ton';
import { useT } from '@/lib/sprache';

export default function Einladungen() {
  const t = useT();
  const router = useRouter();
  const pfad = usePathname();
  const konto = useKonto();
  const [liste, setListe] = useState([]);
  const nutzerId = konto.nutzer?.id;

  const laden = useCallback(async () => {
    const { einladungen } = await einladungenLaden();
    setListe((alt) => {
      if (einladungen.some((e) => !alt.find((a) => a.id === e.id))) klang('fertig');
      return einladungen;
    });
  }, []);

  useEffect(() => {
    if (!nutzerId) {
      setListe([]);
      return undefined;
    }
    laden();
    const abmelden = einladungenAbonnieren(nutzerId, laden);
    const takt = setInterval(() => {
      if (document.visibilityState === 'visible') laden();
    }, 30000);
    return () => {
      abmelden();
      clearInterval(takt);
    };
  }, [nutzerId, laden]);

  const erledigt = (id) => {
    setListe((l) => l.filter((e) => e.id !== id));
    einladungGesehen(id);
  };

  const sichtbar = liste.filter((e) => pfad !== `/party/${e.party}`).slice(0, 3);
  if (!sichtbar.length) return null;

  return (
    <div className="einladungen" aria-live="polite">
      {sichtbar.map((e) => (
        <div key={e.id} className="einladung karte">
          <Avatar wert={e.avatar || avatarAus(e.von)} groesse={44} pose="jubel" />
          <div className="einladung-text">
            <strong>{e.name ?? t('Ein Freund')}</strong>
            <span>{t('lädt dich zur Party ein')}</span>
          </div>
          <div className="einladung-knoepfe">
            <button
              type="button"
              className="knopf knopf-haupt"
              onClick={() => {
                erledigt(e.id);
                router.push(`/party/${e.party}`);
              }}
            >
              {t('Beitreten')}
            </button>
            <button type="button" className="knopf knopf-zweit" onClick={() => erledigt(e.id)}>
              {t('Später')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
