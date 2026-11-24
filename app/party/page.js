/**
 * app/party/page.js – Party (1 gegen 1): Lobby erstellen oder beitreten
 */
import PartyStart from './PartyStart';

export const metadata = { title: 'Party' };

export default function PartySeite() {
  return <PartyStart />;
}
