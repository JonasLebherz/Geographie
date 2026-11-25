/**
 * app/party/page.js – Party (bis zu 8 Spieler, auch in Teams): Lobby erstellen oder beitreten
 */
import PartyStart from './PartyStart';

export const metadata = { title: 'Party' };

export default function PartySeite() {
  return <PartyStart />;
}
