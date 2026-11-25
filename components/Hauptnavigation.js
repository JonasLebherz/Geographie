'use client';
/**
 * components/Hauptnavigation.js – „Spielen“ und „Party“ in der Kopfleiste
 * „Spielen“ führt zur Startseite mit den Kacheln (Weltkarte …). Der aktive Eintrag ist
 * hervorgehoben (heller Knopf wie ein Segment-Schalter).
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/lib/sprache';
import { Gruppe, Spielen } from './Symbole';

export default function Hauptnavigation() {
  const t = useT();
  const pfad = usePathname();
  const party = pfad.startsWith('/party');
  const eintraege = [
    { href: '/', text: t('Spielen'), Symbol: Spielen, aktiv: !party },
    { href: '/party', text: t('Party'), Symbol: Gruppe, aktiv: party },
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
