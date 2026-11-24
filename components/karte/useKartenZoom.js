'use client';
/**
 * components/karte/useKartenZoom.js – Zoomen und Verschieben einer SVG-Karte
 *
 * Bedienung wie in Karten-Apps:
 *  - Mausrad / Touchpad: zoomt an der Stelle des Mauszeigers
 *  - Ziehen (Maus oder ein Finger): verschiebt, sobald hineingezoomt ist
 *  - zwei Finger: zoomen und verschieben
 *  - Knöpfe: rein, raus, ganze Karte
 *
 * Gezoomt wird über die viewBox des SVG. Sie wird direkt am Element gesetzt (nicht über
 * React-State), damit beim Ziehen nicht bei jeder Mausbewegung die ganze Karte neu
 * gerendert wird. React erfährt nur, ob gezoomt ist (für die Knöpfe).
 *
 * Die CSS-Variable --px am SVG = Karteneinheiten je Bildschirmpixel. Damit bleiben
 * Klickpunkte für Kleinstaaten beim Zoomen gleich groß auf dem Bildschirm.
 *
 * Nach dem Ziehen darf kein Klick ausgelöst werden (sonst zählte das Loslassen über
 * einem Land als Antwort): istGezogen() sagt dem Klick-Handler, dass er ihn ignorieren soll.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_ZOOM = 10;
const ZIEH_SCHWELLE = 6; // Pixel Bewegung, ab der ein Klick als Ziehen gilt

const begrenzen = (wert, min, max) => Math.min(max, Math.max(min, wert));

export function useKartenZoom(svgRef, breite, hoehe, onAnsicht) {
  const ansicht = useRef({ x: 0, y: 0, w: breite, h: hoehe });
  // Meldung des sichtbaren Ausschnitts (z. B. für Satellitenkacheln), höchstens einmal je Bild
  const melder = useRef({ fn: onAnsicht, bild: 0 });
  melder.current.fn = onAnsicht;
  const melden = useCallback(() => {
    if (!melder.current.fn || melder.current.bild) return;
    melder.current.bild = requestAnimationFrame(() => {
      melder.current.bild = 0;
      const svg = svgRef.current;
      if (!svg) return;
      // Tatsächlich sichtbarer Bereich (bei „meet“ größer als die viewBox) und Pixel je Einheit
      const { width, height } = svg.getBoundingClientRect();
      const v = ansicht.current;
      const s = Math.min(width / v.w, height / v.h) || 1;
      const sw = width / s;
      const sh = height / s;
      melder.current.fn({ x: v.x - (sw - v.w) / 2, y: v.y - (sh - v.h) / 2, w: sw, h: sh }, s);
    });
  }, [svgRef]);
  // Sobald jemand den Ausschnitt wissen will (z. B. Satellit eingeschaltet): gleich einmal melden
  useEffect(() => {
    if (onAnsicht) melden();
  }, [onAnsicht, melden]);
  const [stand, setStand] = useState({ gezoomt: false, maximal: false });
  const gezogen = useRef(false);
  const animation = useRef(0);

  /** Karteneinheiten je Bildschirmpixel (SVG skaliert mit „meet“: der knappere Wert zählt) */
  const massstab = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return 1;
    const { width, height } = svg.getBoundingClientRect();
    const { w, h } = ansicht.current;
    return Math.max(w / (width || 1), h / (height || 1));
  }, [svgRef]);

  /** Setzt die Ansicht (begrenzt auf Zoomstufe und Kartenrand) und schreibt sie ins SVG. */
  const setzen = useCallback(
    ({ x, y, w }) => {
      const svg = svgRef.current;
      if (!svg) return;
      w = begrenzen(w, breite / MAX_ZOOM, breite);
      const h = (w * hoehe) / breite;
      x = begrenzen(x, 0, breite - w);
      y = begrenzen(y, 0, hoehe - h);
      ansicht.current = { x, y, w, h };
      svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
      svg.style.setProperty('--px', massstab());
      melden();
      const gezoomt = w < breite - 0.5;
      const maximal = w <= breite / MAX_ZOOM + 0.5;
      setStand((alt) => (alt.gezoomt === gezoomt && alt.maximal === maximal ? alt : { gezoomt, maximal }));
    },
    [svgRef, breite, hoehe, massstab, melden],
  );

  /** Bildschirmpunkt → Kartenpunkt (berücksichtigt Ränder durch „meet“) */
  const inKarte = useCallback(
    (clientX, clientY) => {
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
      return { x: p.x, y: p.y };
    },
    [svgRef],
  );

  /** Zoomt um den Faktor f, der Kartenpunkt p bleibt dabei an seiner Stelle. */
  const zoomUm = useCallback(
    (p, f) => {
      const v = ansicht.current;
      const w = begrenzen(v.w / f, breite / MAX_ZOOM, breite);
      const echt = v.w / w;
      setzen({ x: p.x - (p.x - v.x) / echt, y: p.y - (p.y - v.y) / echt, w });
    },
    [breite, setzen],
  );

  /** Weicher Übergang zu einer Zielansicht (für die Knöpfe) */
  const fahren = useCallback(
    (ziel) => {
      cancelAnimationFrame(animation.current);
      const start = { ...ansicht.current };
      const t0 = performance.now();
      const dauer = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240;
      const schritt = (jetzt) => {
        const t = dauer ? Math.min(1, (jetzt - t0) / dauer) : 1;
        const k = 1 - (1 - t) ** 3; // sanft auslaufen
        setzen({ x: start.x + (ziel.x - start.x) * k, y: start.y + (ziel.y - start.y) * k, w: start.w + (ziel.w - start.w) * k });
        if (t < 1) animation.current = requestAnimationFrame(schritt);
      };
      animation.current = requestAnimationFrame(schritt);
    },
    [setzen],
  );

  const knopfZoom = useCallback(
    (f) => {
      const v = ansicht.current;
      const mitte = { x: v.x + v.w / 2, y: v.y + v.h / 2 };
      const w = begrenzen(v.w / f, breite / MAX_ZOOM, breite);
      fahren({ x: mitte.x - w / 2, y: mitte.y - (w * hoehe) / breite / 2, w });
    },
    [breite, hoehe, fahren],
  );

  const zoomRein = useCallback(() => knopfZoom(2), [knopfZoom]);
  const zoomRaus = useCallback(() => knopfZoom(0.5), [knopfZoom]);
  const ganzeKarte = useCallback(() => fahren({ x: 0, y: 0, w: breite }), [fahren, breite]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const zeiger = new Map(); // aktive Finger bzw. Maus: id → { x, y }
    let start = null; // { x, y } beim Drücken, für die Ziehschwelle
    let vorher = null; // letzte Mitte/Abstand bei zwei Fingern

    const mitteUndAbstand = () => {
      const [a, b] = [...zeiger.values()];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
    };

    function rad(e) {
      e.preventDefault();
      const zeilen = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      // Touchpad-Pinch kommt als Rad mit Strg – feiner auflösen
      const staerke = e.ctrlKey ? 0.01 : 0.0022;
      zoomUm(inKarte(e.clientX, e.clientY), Math.exp(-e.deltaY * zeilen * staerke));
    }

    function runter(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      cancelAnimationFrame(animation.current);
      zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (zeiger.size === 1) {
        start = { x: e.clientX, y: e.clientY };
        gezogen.current = false;
      } else if (zeiger.size === 2) {
        vorher = mitteUndAbstand();
        gezogen.current = true; // zwei Finger sind nie ein Klick
      }
    }

    function bewegen(e) {
      const alt = zeiger.get(e.pointerId);
      if (!alt) return;
      const neu = { x: e.clientX, y: e.clientY };
      zeiger.set(e.pointerId, neu);

      if (zeiger.size === 1) {
        if (!gezogen.current && Math.hypot(neu.x - start.x, neu.y - start.y) < ZIEH_SCHWELLE) return;
        if (!gezogen.current) {
          gezogen.current = true;
          svg.setPointerCapture?.(e.pointerId);
          svg.classList.add('zieht');
        }
        const s = massstab();
        const v = ansicht.current;
        setzen({ x: v.x - (neu.x - alt.x) * s, y: v.y - (neu.y - alt.y) * s, w: v.w });
      } else if (zeiger.size === 2 && vorher) {
        const jetzt = mitteUndAbstand();
        zoomUm(inKarte(jetzt.x, jetzt.y), jetzt.d / (vorher.d || 1));
        const s = massstab();
        const v = ansicht.current;
        setzen({ x: v.x - (jetzt.x - vorher.x) * s, y: v.y - (jetzt.y - vorher.y) * s, w: v.w });
        vorher = jetzt;
      }
    }

    function hoch(e) {
      if (!zeiger.delete(e.pointerId)) return;
      if (zeiger.size === 1) {
        // Von zwei auf einen Finger: dort weiterziehen, wo der verbliebene Finger ist
        const [rest] = zeiger.values();
        start = { ...rest };
        vorher = null;
      }
      if (zeiger.size === 0) {
        svg.classList.remove('zieht');
        // Der Klick folgt direkt auf das Loslassen – erst danach zurücksetzen
        if (gezogen.current) setTimeout(() => (gezogen.current = false), 0);
      }
    }

    // Größe geändert (Fenster, Handy gedreht): --px neu berechnen, Ausschnitt melden
    const beobachter = new ResizeObserver(() => {
      svg.style.setProperty('--px', massstab());
      melden();
    });
    beobachter.observe(svg);

    svg.addEventListener('wheel', rad, { passive: false });
    svg.addEventListener('pointerdown', runter);
    svg.addEventListener('pointermove', bewegen);
    svg.addEventListener('pointerup', hoch);
    svg.addEventListener('pointercancel', hoch);
    return () => {
      beobachter.disconnect();
      cancelAnimationFrame(animation.current);
      svg.removeEventListener('wheel', rad);
      svg.removeEventListener('pointerdown', runter);
      svg.removeEventListener('pointermove', bewegen);
      svg.removeEventListener('pointerup', hoch);
      svg.removeEventListener('pointercancel', hoch);
    };
  }, [svgRef, inKarte, massstab, setzen, zoomUm, melden]);

  const istGezogen = useCallback(() => gezogen.current, []);

  return { ...stand, zoomRein, zoomRaus, ganzeKarte, istGezogen };
}
