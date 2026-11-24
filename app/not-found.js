import Link from 'next/link';
import { T } from '@/lib/sprache';

export default function NichtGefunden() {
  return (
    <header className="seitenkopf">
      <h1>
        <T>Seite nicht gefunden</T>
      </h1>
      <p className="fakten">
        <Link href="/">
          <T>Zur Startseite</T>
        </Link>
      </p>
    </header>
  );
}
