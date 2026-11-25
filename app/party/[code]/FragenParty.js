'use client';
/**
 * app/party/[code]/FragenParty.js – Wissensquiz und Schätzen in der Party (2 bis 8 Spieler, auch Teams)
 *
 * Statt der Karte (Lobby-Regel `modus`): Der Gastgeber wählt die Kategorie (Wissensquiz) bzw.
 * startet „Schätzen“; alle bekommen dieselben Fragen in derselben Reihenfolge (Nachricht
 * `fragen-start` mit den Nummern der Fragen). Jeder antwortet für sich; sobald der Erste
 * geantwortet hat, haben die anderen noch die Bedenkzeit (Regel `zeit`), danach zählt „keine
 * Antwort“. Sind alle fertig, wird aufgedeckt – wer was gewählt bzw. geschätzt hat – und nach
 * kurzer Pause geht es für alle gemeinsam weiter.
 *
 * Punkte: Wissensquiz richtig 3 + 1 für die schnellste richtige Antwort (Schiedsrichter ist der
 * Gastgeber, wie in DuellAnsicht.js: `fragen-bonus`), Schätzen 0–100 je Tipp
 * (lib/schaetzfragen.js). Mit Teams zählen die Punkte der Mitglieder zusammen.
 * Nachrichten: `fragen-start`, `fragen-antwort` { nr, nummer, wert }, `fragen-bonus`,
 * `fragen-auswahl` (zurück zur Wahl). `nr` trennt Runden voneinander.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Avatar, { avatarAus } from '@/components/Avatar';
import SchaetzKarte from '@/components/SchaetzKarte';
import TonSchalter from '@/components/TonSchalter';
import { KATEGORIEN, WISSENSFRAGEN } from '@/lib/wissensfragen';
import { SCHAETZFRAGEN, schaetzPunkte } from '@/lib/schaetzfragen';
import { mischen } from '@/components/karte/useQuizRunde';
import { EMOTES, TEAMS } from '@/lib/party/regeln';
import { melden } from '@/lib/statistik';
import { klang } from '@/lib/ton';
import { useT } from '@/lib/sprache';

const BUCHSTABEN = ['A', 'B', 'C', 'D'];
const PAUSE = { wissen: 2600, schaetzen: 4800 }; // ms Aufdecken ansehen
const ALLE = 'alle';

const pool = (modus, kat) =>
  modus === 'schaetzen'
    ? SCHAETZFRAGEN.map((_, i) => i)
    : WISSENSFRAGEN.map((f, i) => (kat === ALLE || f.k === kat ? i : -1)).filter((i) => i >= 0);

/** Punkte je Spieler einer Runde */
function punkteVon(spiel, antworten, bonus) {
  const stand = {};
  spiel.ids.forEach((id, nummer) => {
    for (const [sid, a] of Object.entries(antworten[nummer] ?? {})) {
      const p = spiel.modus === 'schaetzen' ? schaetzPunkte(a.wert, SCHAETZFRAGEN[id]) : a.wert === 0 ? 3 : 0;
      stand[sid] = (stand[sid] ?? 0) + p;
    }
    if (bonus[nummer]) stand[bonus[nummer]] = (stand[bonus[nummer]] ?? 0) + 1;
  });
  return stand;
}

export default function FragenParty({ modus, party, regeln, onSpielt }) {
  const t = useT();
  const host = party.rolle === 'host';
  const ichId = party.ich.id;
  const [spiel, setSpiel] = useState(null); // { nr, modus, kat, ids, teilnehmer, zeit }
  const [ordnung, setOrdnung] = useState([]); // Wissensquiz: Antwort-Reihenfolge je Frage (nur hier gemischt)
  const [nummer, setNummer] = useState(0);
  const [antworten, setAntworten] = useState({}); // nummer → { spielerId: { wert, ankunft } }
  const [bonus, setBonus] = useState({});
  const [fristen, setFristen] = useState({});
  const [jetzt, setJetzt] = useState(Date.now());
  const rundeNr = useRef(null);
  rundeNr.current = spiel?.nr ?? null;

  const beginnen = useCallback((s) => {
    rundeNr.current = s.nr;
    setSpiel(s);
    setOrdnung(s.ids.map(() => mischen([0, 1, 2, 3])));
    setNummer(0);
    setAntworten({});
    setBonus({});
    setFristen({});
    const titel = s.modus === 'schaetzen' ? 'Schätzen' : s.kat === ALLE ? 'Wissensquiz' : `Wissensquiz: ${KATEGORIEN[s.kat].de}`;
    melden('quiz_start', { quiz: s.modus === 'schaetzen' ? 'schaetzen:alle' : `wissen:${s.kat === ALLE ? 'allgemein' : s.kat}`, titel, quizart: s.modus, party: true });
  }, []);

  const laeuft = Boolean(spiel);
  useEffect(() => {
    onSpielt?.(laeuft);
  }, [laeuft, onSpielt]);
  useEffect(() => () => onSpielt?.(false), [onSpielt]);

  // Wechselt der Gastgeber den Modus, ist die alte Runde vorbei
  useEffect(() => {
    if (spiel && spiel.modus !== modus) setSpiel(null);
  }, [modus, spiel]);

  // Nachrichten
  useEffect(
    () =>
      party.abonnieren((n) => {
        if (n.typ === 'fragen-start') beginnen(n.spiel);
        else if (n.typ === 'fragen-auswahl') setSpiel(null);
        else if (n.nr !== rundeNr.current) return;
        else if (n.typ === 'fragen-antwort') {
          const ankunft = Date.now();
          setAntworten((a) => ({ ...a, [n.nummer]: { ...a[n.nummer], [n.von]: { wert: n.wert, ankunft } } }));
        } else if (n.typ === 'fragen-bonus') setBonus((b) => ({ ...b, [n.nummer]: n.an }));
      }),
    [party, beginnen],
  );

  function starten(kat) {
    if (!host) return;
    const s = {
      nr: Date.now(),
      modus,
      kat,
      ids: mischen(pool(modus, kat)).slice(0, regeln.fragen ?? 10),
      teilnehmer: party.spieler.map((sp) => sp.id),
      zeit: regeln.zeit ?? 10,
    };
    party.senden('fragen-start', { spiel: s });
    beginnen(s);
  }

  function zurAuswahl() {
    if (host) party.senden('fragen-auswahl');
    setSpiel(null);
  }

  // Teilnehmer: wer beim Start dabei war und noch da ist
  const anwesend = new Set(party.spieler.map((s) => s.id));
  const teilnehmer = (spiel?.teilnehmer ?? []).filter((id) => anwesend.has(id) || id === ichId);
  const teilnehmerKette = teilnehmer.join(',');
  const spielerVon = (id) => party.spieler.find((s) => s.id === id) ?? (id === ichId ? party.ich : { id, name: '…', avatar: avatarAus(id) });

  const fertig = Boolean(spiel) && nummer >= spiel.ids.length;
  const aktuell = antworten[nummer] ?? {};
  const meine = aktuell[ichId];
  const andereFertig = teilnehmer.some((id) => id !== ichId && aktuell[id]);
  const alleFertig = teilnehmer.length > 0 && teilnehmer.every((id) => aktuell[id]);
  const bedenkzeit = (spiel?.zeit ?? 10) * 1000;

  const antworten_ = useCallback(
    (wert) => {
      if (!spiel || fertig || meine) return;
      setAntworten((a) => ({ ...a, [nummer]: { ...a[nummer], [ichId]: { wert, ankunft: Date.now() } } }));
      party.senden('fragen-antwort', { nr: spiel.nr, nummer, wert });
    },
    [spiel, fertig, meine, nummer, ichId, party],
  );

  // Bedenkzeit, sobald ein anderer geantwortet hat
  const frist = fristen[nummer] ?? null;
  useEffect(() => {
    if (spiel && !fertig && andereFertig && !meine && !frist) setFristen((f) => ({ ...f, [nummer]: Date.now() + bedenkzeit }));
  }, [spiel, fertig, andereFertig, meine, frist, nummer, bedenkzeit]);
  useEffect(() => {
    if (!frist || meine || fertig) return undefined;
    const uhr = setTimeout(() => antworten_(null), Math.max(0, frist - Date.now()));
    const takt = setInterval(() => setJetzt(Date.now()), 200);
    return () => {
      clearTimeout(uhr);
      clearInterval(takt);
    };
  }, [frist, meine, fertig, antworten_]);
  const rest = frist && !meine && !fertig ? Math.max(0, Math.ceil((frist - jetzt) / 1000)) : null;

  // Alle fertig: aufdecken (Ton), kurz zeigen, dann für alle weiter
  const aufgedeckt = Boolean(spiel) && !fertig && alleFertig;
  useEffect(() => {
    if (!aufgedeckt) return undefined;
    const id = spiel.ids[nummer];
    const gut = spiel.modus === 'schaetzen' ? schaetzPunkte(meine?.wert, SCHAETZFRAGEN[id]) >= 35 : meine?.wert === 0;
    klang(gut ? 'richtig' : 'falsch');
    const uhr = setTimeout(() => {
      setNummer((n) => n + 1);
      if (nummer + 1 >= spiel.ids.length) setTimeout(() => klang('fertig'), 200);
    }, PAUSE[spiel.modus]);
    return () => clearTimeout(uhr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aufgedeckt, nummer]);

  // Gastgeber: schnellste richtige Antwort im Wissensquiz bekommt den Bonus
  useEffect(() => {
    if (!host || !spiel || spiel.modus !== 'wissen') return;
    for (const [num, je] of Object.entries(antworten)) {
      if (bonus[num] !== undefined || !teilnehmer.every((id) => je[id])) continue;
      const schnellster = Object.entries(je)
        .filter(([, a]) => a.wert === 0)
        .sort((x, y) => x[1].ankunft - y[1].ankunft)[0]?.[0];
      setBonus((b) => ({ ...b, [num]: schnellster ?? null }));
      if (schnellster) party.senden('fragen-bonus', { nr: spiel.nr, nummer: Number(num), an: schnellster });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, spiel, antworten, bonus, teilnehmerKette]);

  // Tasten 1–4 / A–D im Wissensquiz
  useEffect(() => {
    if (!spiel || spiel.modus !== 'wissen' || fertig) return undefined;
    const taste = (e) => {
      if (e.target.closest?.('input, textarea, select, dialog')) return;
      const k = e.key.toLowerCase();
      const i = ['1', '2', '3', '4'].includes(k) ? Number(k) - 1 : ['a', 'b', 'c', 'd'].indexOf(k);
      if (i >= 0 && ordnung[nummer]) antworten_(ordnung[nummer][i]);
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, [spiel, fertig, ordnung, nummer, antworten_]);

  // Ergebnis an die Statistik
  useEffect(() => {
    if (!fertig) return;
    const stand = punkteVon(spiel, antworten, {});
    const max = spiel.ids.length * (spiel.modus === 'schaetzen' ? 100 : 3);
    melden('quiz_ende', { quiz: spiel.modus === 'schaetzen' ? 'schaetzen:alle' : `wissen:${spiel.kat === ALLE ? 'allgemein' : spiel.kat}`, quote: Math.round((100 * (stand[ichId] ?? 0)) / max) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fertig]);

  // Stand
  const stand = useMemo(() => (spiel ? punkteVon(spiel, antworten, bonus) : {}), [spiel, antworten, bonus]);
  const tabelle = teilnehmer.map((id) => ({ ...spielerVon(id), wert: stand[id] ?? 0, fertig: Boolean(aktuell[id]) })).sort((a, b) => b.wert - a.wert || a.name.localeCompare(b.name));
  const teams = party.teams
    ? TEAMS.map((team, i) => ({ ...team, i, mitglieder: tabelle.filter((s) => party.teams[s.id] === i) }))
        .filter((team) => team.mitglieder.length)
        .map((team) => ({ ...team, wert: team.mitglieder.reduce((n, s) => n + s.wert, 0) }))
        .sort((a, b) => b.wert - a.wert)
    : null;

  if (!spiel) return <Auswahl modus={modus} host={host} gastgeber={party.gastgeber} onStart={starten} />;

  const meinTeam = party.teams?.[ichId];
  const sieger = teams ? teams[0] : tabelle[0];
  const gleichstand = teams ? teams.length > 1 && teams[0].wert === teams[1].wert : tabelle.length > 1 && tabelle[0].wert === tabelle[1].wert;
  const gewonnen = !gleichstand && (teams ? sieger?.i === meinTeam : sieger?.id === ichId);
  const platz = (teams ? teams.findIndex((team) => team.i === meinTeam) : tabelle.findIndex((s) => s.id === ichId)) + 1;
  const titel = spiel.modus === 'schaetzen' ? t('Schätzen') : spiel.kat === ALLE ? t('Wissensquiz') : t.sprache === 'en' ? KATEGORIEN[spiel.kat].en : KATEGORIEN[spiel.kat].de;

  const status = !fertig && (
    <div className="wissen-unten">
      {rest !== null ? (
        <span className="rueckmeldung frist">{t('noch {s} s', { s: rest })}</span>
      ) : meine && !alleFertig ? (
        <span className="rueckmeldung info">{t('Warte auf die anderen …')}</span>
      ) : (
        <span />
      )}
    </div>
  );

  return (
    <div className="fragen-party">
      <div className="fragen-haupt">
        {!fertig && (
          <div className="wissen-stand">
            <span className="stand">
              <strong>{nummer + 1}</strong> / {spiel.ids.length}
            </span>
            <span className="wissen-fortschritt" aria-hidden="true">
              <span style={{ width: `${(100 * (nummer + (aufgedeckt ? 1 : 0))) / spiel.ids.length}%` }} />
            </span>
            <TonSchalter />
          </div>
        )}

        {fertig ? (
          <section className="wissen-karte karte wissen-ergebnis erscheinen">
            <p className="wissen-oben">{titel}</p>
            <p className={`duell-sieger ${gewonnen ? 'sieg' : gleichstand ? 'gleich' : 'niederlage'}`}>
              {gewonnen ? t('Gewonnen!') : gleichstand ? t('Unentschieden') : t('Platz {n}', { n: platz })}
            </p>
            {teams ? (
              <p className="leise">{t('{team} gewinnt', { team: t.ortsname(sieger) })}</p>
            ) : (
              !gewonnen && sieger && <p className="leise">{t('{name} gewinnt', { name: sieger.name })}</p>
            )}
            {host ? (
              <div className="wissen-knoepfe">
                <button type="button" className="knopf knopf-haupt" onClick={() => starten(spiel.kat)}>
                  {t('Revanche')}
                </button>
                <button type="button" className="knopf knopf-zweit" onClick={zurAuswahl}>
                  {t('Anderes Quiz')}
                </button>
              </div>
            ) : (
              <p className="leise">{t('{name} wählt das Quiz.', { name: party.gastgeber?.name ?? t('Gastgeber') })}</p>
            )}
          </section>
        ) : spiel.modus === 'schaetzen' ? (
          <SchaetzKarte
            key={`${spiel.nr}-${nummer}`}
            frage={SCHAETZFRAGEN[spiel.ids[nummer]]}
            onTipp={antworten_}
            gesperrt={Boolean(meine)}
            eigenerTipp={meine ? { wert: meine.wert, punkte: schaetzPunkte(meine.wert, SCHAETZFRAGEN[spiel.ids[nummer]]) } : undefined}
            aufgeloest={aufgedeckt}
            tipps={
              aufgedeckt
                ? teilnehmer
                    .map((id) => {
                      const sp = spielerVon(id);
                      const w = aktuell[id]?.wert ?? null;
                      return { id, name: sp.name, avatar: sp.avatar, wert: w, punkte: schaetzPunkte(w, SCHAETZFRAGEN[spiel.ids[nummer]]), ich: id === ichId };
                    })
                    .sort((a, b) => b.punkte - a.punkte)
                : null
            }
            kopf={<p className="wissen-kategorie">{titel}</p>}
            unten={status}
          />
        ) : (
          <WissenFrage
            key={`${spiel.nr}-${nummer}`}
            frage={WISSENSFRAGEN[spiel.ids[nummer]]}
            ordnung={ordnung[nummer] ?? [0, 1, 2, 3]}
            meine={meine?.wert}
            aufgedeckt={aufgedeckt}
            wer={(wert) => teilnehmer.filter((id) => aktuell[id]?.wert === wert).map(spielerVon)}
            onWahl={antworten_}
            unten={status}
          />
        )}
      </div>

      <aside className="fragen-leiste karte" aria-label={titel}>
        <h2 className="leiste-titel">{titel}</h2>
        {teams && (
          <ol className="team-stand">
            {teams.map((team) => (
              <li key={team.i} style={{ '--team': team.farbe }} className={team.i === meinTeam ? 'ich' : undefined}>
                <span className="team-name">{t.ortsname(team)}</span>
                <strong className="duell-punkte">{team.wert}</strong>
              </li>
            ))}
          </ol>
        )}
        <ol className="duell-stand">
          {tabelle.map((s) => (
            <li key={s.id} className={s.id === ichId ? 'ich' : undefined} style={teams ? { '--team': TEAMS[party.teams?.[s.id] ?? 0].farbe } : undefined}>
              <Avatar wert={s.avatar} groesse={32} />
              <span className="duell-name">
                {s.name}
                {s.id === ichId && <small>{t('du')}</small>}
              </span>
              {!fertig && <span className={`duell-status ${s.fertig ? 'gruen' : 'sucht'}`} aria-label={t(s.fertig ? 'fertig' : 'sucht')} />}
              <strong className="duell-punkte">{s.wert}</strong>
            </li>
          ))}
        </ol>
        <div className="jubel-leiste" role="group" aria-label={t('Jubeln')}>
          {EMOTES.map((em) => (
            <button key={em.art} type="button" onClick={() => party.emote(em.art)} title={t.ortsname({ name: em.text, en: em.en })}>
              <Avatar wert={party.ich.avatar} groesse={30} pose={em.art} />
              <span>{t.ortsname({ name: em.text, en: em.en })}</span>
            </button>
          ))}
        </div>
        <p className="leise">{spiel.modus === 'schaetzen' ? t('Je Tipp bis 100 Punkte') : t('Richtig 3 · Schnellster +1')}</p>
      </aside>
    </div>
  );
}

/** Wissensfrage mit vier Antworten; aufgedeckt mit den Figuren, die die Antwort gewählt haben */
function WissenFrage({ frage, ordnung, meine, aufgedeckt, wer, onWahl, unten }) {
  const t = useT();
  const text = (paar) => (t.sprache === 'en' ? paar[1] : paar[0]);
  const kategorie = KATEGORIEN[frage.k];
  const gewaehlt = meine !== undefined;
  return (
    <section className={`wissen-karte karte${aufgedeckt ? (meine === 0 ? ' impuls-richtig' : ' impuls-falsch') : ''}`} aria-live="polite">
      <p className="wissen-kategorie">{t.sprache === 'en' ? kategorie.en : kategorie.de}</p>
      <h1 className="wissen-frage">{t.sprache === 'en' ? frage.en : frage.de}</h1>
      <div className="wissen-antworten">
        {ordnung.map((wert, i) => {
          const zustand = aufgedeckt ? (wert === 0 ? ' richtig' : wert === meine ? ' falsch' : ' aus') : wert === meine ? ' gewaehlt' : gewaehlt ? ' aus' : '';
          return (
            <button key={wert} type="button" className={`wissen-antwort${zustand}`} onClick={() => onWahl(wert)} disabled={gewaehlt}>
              <span className="buchstabe" aria-hidden="true">
                {BUCHSTABEN[i]}
              </span>
              <span>{text(frage.a[wert])}</span>
              {aufgedeckt && (
                <span className="antwort-wer">
                  {wer(wert).map((s) => (
                    <Avatar key={s.id} wert={s.avatar} groesse={26} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {unten}
    </section>
  );
}

/** Wahl vor der Runde: Kategorien (Wissensquiz) bzw. eine Kachel (Schätzen) – nur der Gastgeber startet */
function Auswahl({ modus, host, gastgeber, onStart }) {
  const t = useT();
  const kacheln =
    modus === 'schaetzen'
      ? [{ id: ALLE, name: t('Schätzen'), n: SCHAETZFRAGEN.length }]
      : [ALLE, ...Object.keys(KATEGORIEN)].map((id) => ({
          id,
          name: id === ALLE ? t('Alle Kategorien') : t.sprache === 'en' ? KATEGORIEN[id].en : KATEGORIEN[id].de,
          n: pool('wissen', id).length,
        }));
  return (
    <div className="fragen-auswahl">
      {!host && <p className="hinweis">{t('{name} wählt das Quiz.', { name: gastgeber?.name ?? t('Gastgeber') })}</p>}
      <div className="wissen-kategorien">
        {kacheln.map((k) => (
          <button key={k.id} type="button" className={`wissen-kat karte${k.id === ALLE ? ' alle' : ''}`} onClick={() => onStart(k.id)} disabled={!host}>
            <strong>{k.name}</strong>
            <span className="leise">{t('{n} Fragen', { n: k.n })}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
