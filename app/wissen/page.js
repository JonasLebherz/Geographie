/**
 * app/wissen/page.js – Wissensquiz: allgemeine Wissensfragen mit vier Antworten (WissensQuiz.js)
 */
import WissensQuiz from './WissensQuiz';

export const metadata = { title: 'Wissensquiz' };

export default function Wissen() {
  return <WissensQuiz />;
}
