/**
 * lib/rechtliches.js – Angaben für Impressum (§ 5 DDG) und Datenschutzerklärung (Art. 13 DSGVO)
 *
 * BITTE AUSFÜLLEN, bevor die Seite öffentlich beworben wird: Name, ladungsfähige Anschrift
 * (kein Postfach) und eine E-Mail-Adresse, unter der man erreichbar ist. Solange etwas fehlt,
 * zeigen /impressum und /datenschutz an dieser Stelle „Angaben folgen“.
 */
export const VERANTWORTLICH = {
  name: '',
  strasse: '',
  ort: '', // z. B. '12345 Musterstadt'
  email: '',
};

export const vollstaendig = () => Boolean(VERANTWORTLICH.name && VERANTWORTLICH.strasse && VERANTWORTLICH.ort && VERANTWORTLICH.email);
