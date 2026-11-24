/**
 * app/karte-daten/quizliste/route.js – alle Quizze aller Gebiete (für die Quiz-Liste links)
 * Beim Bauen erzeugt, statisch ausgeliefert; geladen erst, wenn die Liste aufgeklappt wird.
 */
import { quizListe } from '@/lib/gebiete';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(quizListe());
}
