/**
 * app/impressum/page.js – Impressum (§ 5 DDG). Angaben in lib/rechtliches.js.
 * Rechtstexte bleiben deutsch (maßgeblich ist die deutsche Fassung).
 */
import { VERANTWORTLICH, vollstaendig } from '@/lib/rechtliches';

export const metadata = { title: 'Impressum' };

export default function Impressum() {
  const v = VERANTWORTLICH;
  return (
    <article className="rechtstext">
      <h1>Impressum</h1>
      <h2>Angaben gemäß § 5 DDG</h2>
      {vollstaendig() ? (
        <p>
          {v.name}
          <br />
          {v.strasse}
          <br />
          {v.ort}
          <br />
          E-Mail: <a href={`mailto:${v.email}`}>{v.email}</a>
        </p>
      ) : (
        <p className="hinweis">Angaben folgen.</p>
      )}
      <h2>Verantwortlich für den Inhalt</h2>
      <p>{vollstaendig() ? v.name : 'Angaben folgen.'}</p>
      <h2>Quellen</h2>
      <p>
        Geodaten: Natural Earth (gemeinfrei); Kreisgrenzen: © EuroGeographics; Städte: GeoNames (CC BY 4.0); Wissen: Wikidata (CC0);
        Fotos: Wikimedia Commons (Urheber und Lizenz am jeweiligen Bild); Satellitenbild: Sentinel-2 cloudless 2016 von EOX (CC BY 4.0);
        Flaggen: flag-icons (MIT).
      </p>
    </article>
  );
}
