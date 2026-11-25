'use client';
/**
 * components/FreundeEinladen.js – „Freunde einladen“ in der Lobby (app/party/[code]/Lobby.js)
 *
 * Knopf neben „Link kopieren“; öffnet eine kleine Liste der eigenen Freunde mit „Einladen“
 * (danach „Eingeladen“). Die Einladung erscheint beim Freund sofort (components/Einladungen.js).
 * Nur angemeldet und mit Supabase – sonst gibt es den Knopf nicht. Esc oder Klick daneben schließt.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Avatar, { avatarAus } from './Avatar';
import { Freunde as FreundeSymbol } from './Symbole';
import { useKonto } from '@/lib/konto';
import { einladen, freundeLaden } from '@/lib/freunde';
import { useT } from '@/lib/sprache';

export default function FreundeEinladen({ code, imSpiel = [] }) {
  const t = useT();
  const konto = useKonto();
  const [offen, setOffen] = useState(false);
  const [freunde, setFreunde] = useState(null);
  const [eingeladen, setEingeladen] = useState({});
  const huelle = useRef(null);

  useEffect(() => {
    if (!offen) return undefined;
    freundeLaden().then(({ freunde: liste }) => setFreunde(liste));
    const daneben = (e) => {
      if (!huelle.current?.contains(e.target)) setOffen(false);
    };
    const taste = (e) => {
      if (e.key === 'Escape') setOffen(false);
    };
    document.addEventListener('pointerdown', daneben);
    document.addEventListener('keydown', taste);
    return () => {
      document.removeEventListener('pointerdown', daneben);
      document.removeEventListener('keydown', taste);
    };
  }, [offen]);

  if (!konto.verfuegbar || !konto.nutzer) return null;

  return (
    <div className="freunde-einladen" ref={huelle}>
      <button type="button" className="knopf knopf-zweit" onClick={() => setOffen((o) => !o)} aria-expanded={offen}>
        <FreundeSymbol />
        {t('Freunde einladen')}
      </button>
      {offen && (
        <div className="freunde-einladen-liste karte" role="dialog" aria-label={t('Freunde einladen')}>
          {!freunde ? (
            <div className="statistik-laedt klein" aria-busy="true" />
          ) : !freunde.length ? (
            <p className="hinweis">
              {t('Noch keine Freunde')} · <Link href="/freunde">{t('Freunde')}</Link>
            </p>
          ) : (
            <ul>
              {freunde.map((f) => {
                const schonDa = imSpiel.includes(f.name);
                return (
                  <li key={f.id}>
                    <Avatar wert={f.avatar || avatarAus(f.id)} groesse={36} />
                    <span>{f.name ?? '–'}</span>
                    <button
                      type="button"
                      className="knopf knopf-haupt"
                      disabled={Boolean(eingeladen[f.id]) || schonDa}
                      onClick={async () => {
                        const r = await einladen(f.id, code);
                        if (!r.fehler) setEingeladen((e) => ({ ...e, [f.id]: true }));
                      }}
                    >
                      {schonDa ? t('Ist dabei') : eingeladen[f.id] ? t('Eingeladen') : t('Einladen')}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
