/**
 * app/layout.js – Grundgerüst jeder Seite (Kopfzeile, Hauptbereich, Fußzeile)
 */
import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: { default: 'Geo-Quiz', template: '%s · Geo-Quiz' },
  description: 'Geografie-Quizze: Länder, Regionen und Bundesländer an ihren Umrissen erkennen.',
};

export default function Layout({ children }) {
  return (
    <html lang="de">
      <body>
        <header className="kopf">
          <Link href="/" className="logo">
            🌍 Geo-Quiz
          </Link>
        </header>
        <main className="inhalt">{children}</main>
        <footer className="fuss">
          Geodaten: <a href="https://www.naturalearthdata.com/">Natural Earth</a> (gemeinfrei)
        </footer>
      </body>
    </html>
  );
}
