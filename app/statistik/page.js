/**
 * app/statistik/page.js – Statistik für Admins (Besuche, Quizze, Konten, Weltkarte)
 * Die Zahlen lädt StatistikSeite im Browser über Supabase-Funktionen, die selbst prüfen, ob der
 * Angemeldete Admin ist (supabase/schema.sql). Die Seite bringt nur die Weltkarte mit.
 */
import { statistikKarte } from '@/lib/gebiete';
import StatistikSeite from './StatistikSeite';

export const metadata = { title: 'Statistik', robots: { index: false, follow: false } };

export default function Statistik() {
  return <StatistikSeite karte={statistikKarte()} />;
}
