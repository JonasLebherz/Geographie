/**
 * app/quiz/[slug]/page.js – Seite für ein Umriss-Quiz
 *
 * Die Seite wird beim Bauen (npm run build) fertig erzeugt: Geodaten laden,
 * SVG-Pfade berechnen, als statische Seite ablegen. Beim Aufruf rechnet
 * der Server also nichts mehr.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { QUIZZE, quizFinden } from '@/lib/quizze';
import { Chevron } from '@/components/Symbole';
import QuizSpiel from './QuizSpiel';

// Nur Quizze aus lib/quizze gibt es, alles andere ergibt „Seite nicht gefunden“
export const dynamicParams = false;

export function generateStaticParams() {
  return QUIZZE.map((quiz) => ({ slug: quiz.slug }));
}

export async function generateMetadata({ params }) {
  const quiz = quizFinden((await params).slug);
  return { title: quiz?.titel };
}

export default async function QuizSeite({ params }) {
  const quiz = quizFinden((await params).slug);
  if (!quiz) notFound();

  const { laden } = await quiz.geodaten();
  const gebiete = laden();

  return (
    <div className="schmal">
      <header className="seitenkopf erscheinen">
        <Link href="/" className="zurueck">
          <Chevron richtung="links" className="" />
          Quizze
        </Link>
        <h1>{quiz.titel}</h1>
        <p className="fakten">
          {gebiete.length} {quiz.einheit ?? 'Länder'} · {quiz.runden} Fragen
        </p>
      </header>
      <QuizSpiel quiz={quiz.slug} gebiete={gebiete} frage={quiz.frage} runden={quiz.runden} />
    </div>
  );
}
