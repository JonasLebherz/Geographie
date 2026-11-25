'use client';
/**
 * lib/party/kanal.js – Verbindung zwischen den Spielern einer Lobby
 *
 * Mit Supabase (wie auf Vercel eingerichtet): Supabase Realtime – „Broadcast“ für Nachrichten
 * und „Presence“ für die Liste der Anwesenden. Dafür ist keine Tabelle nötig; die Nachrichten
 * gehen nur durch, gespeichert wird nichts.
 * Ohne Supabase (lokal): BroadcastChannel des Browsers – damit lässt sich die Party in zwei
 * Tabs desselben Browsers ausprobieren.
 *
 * kanalOeffnen(code, { ich: { id, name, host, avatar }, onNachricht, onAnwesend })
 *   onAnwesend([{ id, name, host, avatar, seit }]) – seit = Ankunft (Reihenfolge der Spieler)
 *   → { senden(typ, daten), aktualisieren(ich), schliessen() }
 * Nachrichten kommen als { typ, von, ...daten } an – nie die eigenen.
 */
import { supabase } from '@/lib/supabase/client';

export function kanalOeffnen(code, { ich, onNachricht, onAnwesend }) {
  const db = supabase();
  return db ? supabaseKanal(db, code, { ich, onNachricht, onAnwesend }) : browserKanal(code, { ich, onNachricht, onAnwesend });
}

function supabaseKanal(db, code, { ich, onNachricht, onAnwesend }) {
  const kanal = db.channel(`geo-quiz-party-${code}`, {
    config: { broadcast: { self: false }, presence: { key: ich.id } },
  });
  let eigene = ich;
  const seit = Date.now(); // Ankunft – bestimmt die Reihenfolge (höchstens 8 spielen mit)
  kanal.on('broadcast', { event: 'nachricht' }, ({ payload }) => onNachricht(payload));
  kanal.on('presence', { event: 'sync' }, () => {
    const stand = kanal.presenceState();
    onAnwesend(Object.entries(stand).map(([id, metas]) => ({ id, ...metas[0] })));
  });
  kanal.subscribe((status) => {
    if (status === 'SUBSCRIBED') kanal.track({ name: eigene.name, host: eigene.host, avatar: eigene.avatar, seit });
  });
  return {
    senden: (typ, daten = {}) => kanal.send({ type: 'broadcast', event: 'nachricht', payload: { typ, von: ich.id, ...daten } }),
    aktualisieren: (neu) => {
      eigene = { ...eigene, ...neu };
      kanal.track({ name: eigene.name, host: eigene.host, avatar: eigene.avatar, seit });
    },
    schliessen: () => db.removeChannel(kanal),
  };
}

/** Ersatz ohne Server: BroadcastChannel (nur Tabs im selben Browser) mit selbstgebauter Anwesenheit */
function browserKanal(code, { ich, onNachricht, onAnwesend }) {
  const kanal = new BroadcastChannel(`geo-quiz-party-${code}`);
  let eigene = ich;
  const seit = Date.now();
  const andere = new Map(); // id → { name, host, avatar, seit, zuletzt }
  const melden = () => {
    const jetzt = Date.now();
    for (const [id, a] of andere) if (jetzt - a.zuletzt > 6000) andere.delete(id);
    onAnwesend([{ id: eigene.id, name: eigene.name, host: eigene.host, avatar: eigene.avatar, seit }, ...[...andere].map(([id, a]) => ({ id, ...a }))]);
  };
  const hallo = () => kanal.postMessage({ art: 'hier', id: eigene.id, name: eigene.name, host: eigene.host, avatar: eigene.avatar, seit });
  kanal.onmessage = ({ data }) => {
    if (data.art === 'hier') {
      const neu = !andere.has(data.id);
      andere.set(data.id, { name: data.name, host: data.host, avatar: data.avatar, seit: data.seit, zuletzt: Date.now() });
      if (neu) hallo(); // Neuankömmling soll uns sofort sehen
      melden();
    } else if (data.art === 'weg') {
      andere.delete(data.id);
      melden();
    } else if (data.art === 'nachricht') {
      onNachricht(data.payload);
    }
  };
  hallo();
  melden();
  const takt = setInterval(() => {
    hallo();
    melden();
  }, 2000);
  return {
    senden: (typ, daten = {}) => kanal.postMessage({ art: 'nachricht', payload: { typ, von: eigene.id, ...daten } }),
    aktualisieren: (neu) => {
      eigene = { ...eigene, ...neu };
      hallo();
      melden();
    },
    schliessen: () => {
      clearInterval(takt);
      kanal.postMessage({ art: 'weg', id: eigene.id });
      kanal.close();
    },
  };
}
