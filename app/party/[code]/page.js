/**
 * app/party/[code]/page.js – Lobby, z. B. /party/flinker-pinguin
 * Der Code ist frei wählbar (jeder Link ist eine Lobby); die Seite selbst rechnet nichts –
 * die Karte lädt die Lobby im Browser nach.
 */
import { notFound } from 'next/navigation';
import { codeAus } from '@/lib/party/codes';
import Lobby from './Lobby';

export const metadata = { title: 'Party' };

export default async function LobbySeite({ params }) {
  const code = codeAus((await params).code);
  if (!code) notFound();
  return <Lobby code={code} />;
}
