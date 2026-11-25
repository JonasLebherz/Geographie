/**
 * app/konto/page.js – eigenes Konto: Name, Passwort, Abmelden, Konto löschen
 * Auch Ziel des Links „Passwort zurücksetzen“ aus der Mail (dann steht das neue Passwort oben).
 */
import KontoSeite from './KontoSeite';

export const metadata = { title: 'Konto', robots: { index: false } };

export default function Konto() {
  return <KontoSeite />;
}
