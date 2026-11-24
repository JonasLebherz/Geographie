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
import { T } from '@/lib/sprache';
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
          <T>Quizze</T>
        </Link>
        <h1>
          <T>{quiz.titel}</T>
        </h1>
        <p className="fakten">
          <T text={`{n} ${quiz.einheit ?? 'Länder'} · {r} Fragen`} werte={{ n: gebiete.length, r: quiz.runden }} />
        </p>
      </header>
      <QuizSpiel quiz={quiz.slug} gebiete={gebiete} frage={quiz.frage} runden={quiz.runden} />
    </div>
  );
}
