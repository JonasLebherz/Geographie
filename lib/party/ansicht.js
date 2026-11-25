'use client';
/**
 * lib/party/ansicht.js – feste Kartenansicht in der Party
 *
 * Der Gastgeber kann in den Spielregeln „nur Karte“ oder „nur Satellit“ festlegen. Die Lobby
 * stellt den Wert bereit, components/karte/KarteEbene.js liest ihn ('frei' = jeder wie er will).
 */
import { createContext } from 'react';

export const AnsichtKontext = createContext('frei');
