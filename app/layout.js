/**
 * app/layout.js – Grundgerüst jeder Seite (Kopfzeile, Hauptbereich, Fußzeile)
 *
 * Kopfzeile: links Logo, rechts das Profil mit den Einstellungen (components/ProfilMenue.js).
 * Hell/Dunkel und Sprache setzt START_SKRIPT schon vor dem ersten Anzeigen (Standard: hell,
 * Deutsch), damit nichts aufblitzt. suppressHydrationWarning, weil das Skript <html>
 * verändert, bevor React übernimmt.
 */
import Link from 'next/link';
import Logo, { PRODUKTNAME } from '@/components/Logo';
import ProfilMenue from '@/components/ProfilMenue';
import Hauptnavigation from '@/components/Hauptnavigation';
import { T } from '@/lib/sprache';
import { START_SKRIPT } from '@/lib/einstellungen-start';
import './globals.css';

export const metadata = {
  title: { default: PRODUKTNAME, template: `%s · ${PRODUKTNAME}` },
  description: 'Geografie-Quizze: Länder auf der Karte finden und an ihren Umrissen erkennen.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f4f2ed',
};

export default function Layout({ children }) {
  return (
    <html lang="de" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: START_SKRIPT }} />
      </head>
      <body>
        <header className="kopf">
          <div className="kopf-innen">
            <Link href="/" className="marke">
              <Logo />
              <span className="marke-name">{PRODUKTNAME}</span>
            </Link>
            <Hauptnavigation />
            <ProfilMenue />
          </div>
        </header>
        <main className="inhalt">{children}</main>
        <footer className="fuss">
          <T>Geodaten</T>: <a href="https://www.naturalearthdata.com/">Natural Earth</a> (<T>gemeinfrei</T>) ·{' '}
          <T>Kreisgrenzen</T>: © <a href="https://ec.europa.eu/eurostat/web/gisco">EuroGeographics</a>
        </footer>
      </body>
    </html>
  );
}
