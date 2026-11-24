import Link from 'next/link';

export default function NichtGefunden() {
  return (
    <>
      <h1>Seite nicht gefunden</h1>
      <p>
        <Link href="/">Zurück zur Startseite</Link>
      </p>
    </>
  );
}
