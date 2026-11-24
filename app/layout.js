/**
 * app/layout.js – Grundgerüst jeder Seite (Kopfzeile, Hauptbereich, Fußzeile)
 *
 * Hell/Dunkel folgt dem Betriebssystem (prefers-color-scheme in globals.css).
 */
import Link from 'next/link';
import Logo, { PRODUKTNAME } from '@/components/Logo';
import './globals.css';

export const metadata = {
  title: { default: PRODUKTNAME, template: `%s · ${PRODUKTNAME}` },
  description: 'Geografie-Quizze: Länder auf der Karte finden und an ihren Umrissen erkennen.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e9e6e0' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0d10' },
  ],
};

export default function Layout({ children }) {
  return (
    <html lang="de">
      <body>
        <header className="kopf">
          <div className="kopf-innen">
            <Link href="/" className="marke">
              <Logo />
              {PRODUKTNAME}
            </Link>
          </div>
        </header>
        <main className="inhalt">{children}</main>
        <footer className="fuss">
          Geodaten: <a href="https://www.naturalearthdata.com/">Natural Earth</a> (gemeinfrei)
        </footer>
      </body>
    </html>
  );
}
