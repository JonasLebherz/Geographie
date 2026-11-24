/**
 * lib/einstellungen-start.js – Namen und Standardwerte der Einstellungen + Start-Skript
 *
 * Bewusst KEINE Client-Datei: Das Layout (Server) braucht START_SKRIPT als echten Text.
 * Die Einstellungen selbst liest und schreibt lib/einstellungen.js.
 */
export const STANDARD = { darstellung: 'hell', ton: 'an', lautstaerke: 0.7, sprache: 'de' };

export const SCHLUESSEL = {
  darstellung: 'geo-quiz-darstellung',
  ton: 'geo-quiz-ton',
  lautstaerke: 'geo-quiz-lautstaerke',
  sprache: 'geo-quiz-sprache',
};

/** Läuft im <head> vor React: setzt data-theme und lang, damit nichts aufblitzt. */
export const START_SKRIPT = `(function(){try{
var d=localStorage.getItem('${SCHLUESSEL.darstellung}')||'${STANDARD.darstellung}';
var s=localStorage.getItem('${SCHLUESSEL.sprache}')||'${STANDARD.sprache}';
var dunkel=d==='dunkel'||(d==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.setAttribute('data-theme',dunkel?'dark':'light');
document.documentElement.setAttribute('lang',s);
}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;
