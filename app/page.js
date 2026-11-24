/**
 * app/page.js – Hauptmenü: alle Spielarten als Karten mit Vorschaubild
 *
 * Bewusst kurz statt einer langen Quiz-Liste: je Spielart eine Karte, gruppiert nach
 * Gebiet („Welt“, später z. B. „Deutschland“). Unter dem Titel stehen nur Fakten
 * (Anzahl Länder, Fragen), keine Bedienhinweise.
 *
 * Wird beim Bauen fertig erzeugt. Die Vorschaubilder sind kleine, grobe SVG-Pfade.
 */
import Link from 'next/link';
import { QUIZZE } from '@/lib/quizze';
import { KONTINENTE } from '@/lib/geodaten/kontinente';
import { weltKarte } from '@/lib/geodaten/karte';
import { GROESSE } from '@/lib/geodaten/umriss';
import { Chevron } from '@/components/Symbole';
import { T } from '@/lib/sprache';

export const metadata = { title: { absolute: 'Geo-Quiz' } };

function ModusKarte({ href, titel, fakten, bild, i }) {
  return (
    <Link href={href} className="karte modus erscheinen" style={{ '--i': i }}>
      <div className="modus-bild" aria-hidden="true">
        {bild}
      </div>
      <div className="modus-text">
        <div>
          <h3>
            <T>{titel}</T>
          </h3>
          <p>
            <T text={fakten.text} werte={fakten.werte} />
          </p>
        </div>
        <Chevron />
      </div>
    </Link>
  );
}

export default async function Hauptmenue() {
  const welt = weltKarte({ grob: true });
  const anzahlen = KONTINENTE.map((k) => k.laender.length);
  const laender = anzahlen.reduce((a, b) => a + b, 0);

  // Umriss-Quizze: Anzahl der Gebiete und ein Vorschau-Umriss (nur beim Bauen berechnet)
  const umrissQuizze = await Promise.all(
    QUIZZE.map(async (quiz) => {
      const gebiete = (await quiz.geodaten()).laden();
      const vorschau = gebiete.find((g) => g.id === quiz.vorschau)?.pfad ?? gebiete[0]?.pfad;
      return { ...quiz, anzahl: gebiete.length, vorschau };
    }),
  );

  return (
    <>
      <header className="seitenkopf erscheinen">
        <p className="eyebrow">
          <T>Geografie</T>
        </p>
        <h1>
          <T>Quizze</T>
        </h1>
        <p className="fakten">
          <T text="{n} Länder · {k} Kontinente" werte={{ n: laender, k: KONTINENTE.length }} />
        </p>
      </header>

      <section className="menue-gruppe">
        <h2 className="abschnitt-titel erscheinen">
          <T>Welt</T>
        </h2>
        <div className="modi">
          <ModusKarte
            href="/kontinente"
            titel="Länder eines Kontinents"
            fakten={{
              text: '{k} Kontinente · {von} bis {bis} Länder',
              werte: { k: KONTINENTE.length, von: Math.min(...anzahlen), bis: Math.max(...anzahlen) },
            }}
            i={1}
            bild={
              <svg className="vorschau-welt" viewBox={`-20 -20 ${welt.breite + 40} ${welt.hoehe + 40}`}>
                {welt.kontinente.map((k) => (
                  <path key={k.slug} d={k.pfad} />
                ))}
              </svg>
            }
          />
          {umrissQuizze.map((quiz, i) => (
            <ModusKarte
              key={quiz.slug}
              href={`/quiz/${quiz.slug}`}
              titel={quiz.titel}
              fakten={{ text: `{n} ${quiz.einheit ?? 'Länder'} · {r} Fragen`, werte: { n: quiz.anzahl, r: quiz.runden } }}
              i={i + 2}
              bild={
                <svg className="vorschau-umriss" viewBox={`0 0 ${GROESSE} ${GROESSE}`}>
                  <path d={quiz.vorschau} />
                </svg>
              }
            />
          ))}
        </div>
      </section>
    </>
  );
}
