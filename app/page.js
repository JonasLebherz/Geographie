/**
 * app/page.js – Startseite mit allen Quizzen
 */
import Link from 'next/link';
import { QUIZZE } from '@/lib/quizze';

export default function Startseite() {
  return (
    <>
      <h1>Welches Quiz möchtest du spielen?</h1>
      <div className="kacheln">
        {QUIZZE.map((quiz) => (
          <Link key={quiz.slug} href={`/quiz/${quiz.slug}`} className="kachel">
            <h2>{quiz.titel}</h2>
            <p>{quiz.beschreibung}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
