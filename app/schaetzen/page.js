/**
 * app/schaetzen/page.js – „Schätzen“: Fragen mit einer Zahl als Antwort (SchaetzQuiz.js)
 */
import SchaetzQuiz from './SchaetzQuiz';

export const metadata = { title: 'Schätzen' };

export default function Schaetzen() {
  return <SchaetzQuiz />;
}
