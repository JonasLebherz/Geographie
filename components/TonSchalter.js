'use client';
/**
 * components/TonSchalter.js – Ton an/aus (Lautsprecher-Symbol), z. B. in der Spielleiste
 * Gleiche Einstellung wie im Profil-Menü (lib/einstellungen.js).
 */
import { useEinstellung } from '@/lib/einstellungen';
import { useT } from '@/lib/sprache';
import { Lautsprecher } from './Symbole';

export default function TonSchalter() {
  const t = useT();
  const [ton, setTon] = useEinstellung('ton');
  const an = ton !== 'aus';
  const text = an ? t('Ton ausschalten') : t('Ton einschalten');
  return (
    <button
      type="button"
      className="symbolknopf"
      onClick={() => setTon(an ? 'aus' : 'an')}
      aria-pressed={!an}
      aria-label={text}
      title={text}
    >
      <Lautsprecher an={an} />
    </button>
  );
}
