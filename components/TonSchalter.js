'use client';
/**
 * components/TonSchalter.js – Ton an/aus (Lautsprecher-Symbol)
 */
import { useStumm } from '@/lib/ton';
import { Lautsprecher } from './Symbole';

export default function TonSchalter() {
  const [stumm, umschalten] = useStumm();
  return (
    <button
      type="button"
      className="symbolknopf"
      onClick={umschalten}
      aria-pressed={stumm}
      aria-label={stumm ? 'Ton einschalten' : 'Ton ausschalten'}
      title={stumm ? 'Ton einschalten' : 'Ton ausschalten'}
    >
      <Lautsprecher an={!stumm} />
    </button>
  );
}
