/**
 * app/datenschutz/page.js – Datenschutzerklärung (Art. 13 DSGVO)
 *
 * Beschreibt, was die Seite tatsächlich tut: Hosting bei Vercel, Supabase für Bestenliste, Konten,
 * Party und anonyme Nutzungsstatistik, Speicherung im Browser, Bilder von Wikimedia Commons und Satellitenkacheln von EOX.
 * Bei neuen Diensten oder Daten hier ergänzen. Angaben zum Verantwortlichen in lib/rechtliches.js.
 */
import Link from 'next/link';
import { VERANTWORTLICH, vollstaendig } from '@/lib/rechtliches';

export const metadata = { title: 'Datenschutz' };

export default function Datenschutz() {
  const v = VERANTWORTLICH;
  return (
    <article className="rechtstext">
      <h1>Datenschutzerklärung</h1>

      <h2>1. Verantwortlich</h2>
      {vollstaendig() ? (
        <p>
          {v.name}, {v.strasse}, {v.ort}, E-Mail: <a href={`mailto:${v.email}`}>{v.email}</a>
        </p>
      ) : (
        <p className="hinweis">
          Angaben folgen (siehe <Link href="/impressum">Impressum</Link>).
        </p>
      )}

      <h2>2. Aufruf der Seite (Hosting)</h2>
      <p>
        Die Seite liegt bei Vercel Inc. (Rechenzentrum Frankfurt am Main). Beim Aufruf verarbeitet Vercel technisch nötige Daten wie
        IP-Adresse, Zeitpunkt, aufgerufene Adresse und Browserkennung, um die Seite auszuliefern und vor Missbrauch zu schützen
        (Art. 6 Abs. 1 lit. f DSGVO). Vercel ist Auftragsverarbeiter; für Übermittlungen in die USA gelten das EU-US Data Privacy
        Framework bzw. Standardvertragsklauseln. Es gibt keine Werbung, kein Tracking und keine Analyse-Cookies.
      </p>

      <h2>3. Speicherung im Browser</h2>
      <p>
        Einstellungen (Stil, Darstellung, Ton, Sprache, Ansicht), die Comic-Figur, der zuletzt benutzte Name und eigene Bestwerte
        werden nur im eigenen Browser gespeichert (localStorage). Mit Konto liegt dort außerdem die Anmeldesitzung. Das ist für die
        gewünschten Funktionen unbedingt erforderlich (§ 25 Abs. 2 TDDDG) und lässt sich jederzeit über die Browser-Einstellungen löschen.
      </p>

      <h2>4. Konto (freiwillig)</h2>
      <p>
        Wer ein Konto anlegt, gibt E-Mail-Adresse, Passwort und einen Namen an. Gespeichert werden außerdem die Comic-Figur und die
        eigenen Bestwerte, damit sie auf jedem Gerät verfügbar sind (Art. 6 Abs. 1 lit. b DSGVO). Das Passwort wird nur verschlüsselt
        (als Hash) gespeichert. Die E-Mail-Adresse dient nur der Anmeldung, der Bestätigung und dem Zurücksetzen des Passworts.
        Das Konto lässt sich jederzeit unter <Link href="/konto">Konto</Link> selbst löschen; Profil und Bestwerte werden dabei mitgelöscht.
      </p>

      <h2>5. Bestenliste und Party</h2>
      <p>
        Wer sich in eine Bestenliste einträgt, veröffentlicht dort den gewählten Namen, das Ergebnis und die Spieldauer – bitte keinen
        vollen Namen verwenden. In einer Party sehen die anderen Mitspieler Name und Comic-Figur; die Spielnachrichten werden nur
        weitergeleitet und nicht gespeichert.
      </p>
      <p>
        Datenbank, Anmeldung und Party laufen über Supabase Inc. als Auftragsverarbeiter (Server in der EU); für etwaige Zugriffe aus
        den USA gelten Standardvertragsklauseln.
      </p>

      <h2>6. Nutzungsstatistik</h2>
      <p>
        Um zu sehen, welche Quizze gespielt werden und was verbessert werden sollte, zählen wir ohne Cookies und ohne Kennung im Browser:
        Besuche und Seitenwechsel, gestartete und beendete Quizze (mit Ergebnis und Dauer), erstellte Partys sowie Anmeldungen. Dazu
        speichern wir Geräteart (Handy, Tablet, Computer), Sprache, die verweisende Seite (nur deren Name, z. B. „google.com“) und den
        ungefähren Ort (Land, Region, Stadt). Den Ort ermittelt unser Hoster beim Aufruf aus der IP-Adresse; die IP-Adresse selbst wird
        dabei nicht gespeichert. Bei angemeldeten Spielern werden diese Angaben dem Konto zugeordnet. Rechtsgrundlage ist unser
        berechtigtes Interesse an der Verbesserung des Angebots (Art. 6 Abs. 1 lit. f DSGVO). Einsehen kann die Statistik nur der
        Betreiber. Beim Löschen eines Kontos wird die Zuordnung entfernt; die Zahlen bleiben anonym erhalten.
      </p>

      <h2>7. Bilder und Satellitenkarte</h2>
      <p>
        Fotos in manchen Quizzen lädt der Browser direkt von Wikimedia Commons (Wikimedia Foundation, USA), das Satellitenbild direkt von
        EOX IT Services GmbH (Österreich). Dabei erhalten diese Anbieter die IP-Adresse und Browserdaten (Art. 6 Abs. 1 lit. f DSGVO,
        berechtigtes Interesse an der Darstellung der Inhalte). Schriften liegen auf unserem eigenen Server.
      </p>

      <h2>8. Speicherdauer</h2>
      <p>
        Kontodaten bis zur Löschung des Kontos, Einträge in der Bestenliste bis auf Widerruf, Nutzungsstatistik höchstens zwei Jahre, Server-Protokolle beim Hoster nur kurz
        (in der Regel wenige Tage).
      </p>

      <h2>9. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch
        (Art. 15–21 DSGVO) sowie auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde. Eine Nachricht an die oben genannte Adresse genügt.
      </p>
    </article>
  );
}
