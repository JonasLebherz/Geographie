'use client';
/**
 * components/Hauptnavigation.js – „Spielen“, „Party“ und „Freunde“ in der Kopfleiste
 * „Spielen“ führt zur Startseite mit den Kacheln (Weltkarte …), „Freunde“ zur Vorschau des
 * Freunde-Bereichs (app/freunde). Der aktive Eintrag ist hervorgehoben.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/lib/sprache';
import { Freunde, Gruppe, Spielen } from './Symbole';

export default function Hauptnavigation() {
  const t = useT();
  const pfad = usePathname();
  const party = pfad.startsWith('/party');
  const freunde = pfad.startsWith('/freunde');
  const eintraege = [
    { href: '/', text: t('Spielen'), Symbol: Spielen, aktiv: !party && !freunde },
    { href: '/party', text: t('Party'), Symbol: Gruppe, aktiv: party },
    { href: '/freunde', text: t('Freunde'), Symbol: Freunde, aktiv: freunde },
  ];
  return (
    <nav className="hauptnav" aria-label={t('Hauptmenü')}>
      {eintraege.map(({ href, text, Symbol, aktiv }) => (
        <Link key={href} href={href} className={aktiv ? 'aktiv' : undefined} aria-current={aktiv ? 'page' : undefined}>
          <Symbol />
          <span>{text}</span>
        </Link>
      ))}
    </nav>
  );
}
