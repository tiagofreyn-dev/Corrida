// Calculadora de paces estilo VDOT (Jack Daniels, simplificada).
// Usa fórmula de Daniels-Gilbert para estimar VDOT a partir de prova recente
// e deriva ritmos de treino: Easy, Long, Threshold (Tempo), Interval (VO2max).

function vdotFromRace(distanceM: number, timeSec: number): number {
  const t = timeSec / 60; // minutos
  const v = distanceM / timeSec; // m/s
  const vo2 =
    -4.6 +
    0.182258 * v * 60 +
    0.000104 * Math.pow(v * 60, 2);
  const percentMax =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * t) +
    0.2989558 * Math.exp(-0.1932605 * t);
  return vo2 / percentMax;
}

/** Velocidade (m/min) correspondente a um dado VDOT e fração de VO2max. Resolve por busca. */
function velocityForVdot(vdot: number, frac: number): number {
  const target = vdot * frac;
  let lo = 100;
  let hi = 450;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const vo2 = -4.6 + 0.182258 * mid + 0.000104 * mid * mid;
    if (vo2 < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2; // m/min
}

function secPerKm(velocityMmin: number): number {
  return 1000 / velocityMmin * 60;
}

export function formatPace(secPerKmVal: number): string {
  const total = Math.round(secPerKmVal);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatPaceRange(secPerKmVal: number, spreadSec = 20): string {
  const lo = secPerKmVal - spreadSec / 2;
  const hi = secPerKmVal + spreadSec / 2;
  return `${formatPace(lo)}–${formatPace(hi)} /km`;
}

export interface PaceResult {
  easy: string;
  long: string;
  tempo: string;
  interval: string;
  easySec: number;
  longSec: number;
  tempoSec: number;
  intervalSec: number;
  vdot: number;
}

/**
 * Calcula faixas de pace a partir de tempo de referência nos 5k ou 10k.
 * @param refDistance '5k' | '10k'
 * @param totalSec tempo total em segundos
 */
export function calculatePaces(
  refDistance: '5k' | '10k',
  totalSec: number,
): PaceResult {
  const distanceM = refDistance === '5k' ? 5000 : 10000;
  const vdot = vdotFromRace(distanceM, totalSec);

  // Frações de VDOT por zona (padrão Daniels aproximado)
  const easyV = velocityForVdot(vdot, 0.65); // Easy ~65%
  const longV = velocityForVdot(vdot, 0.70); // Long/Marathon-ish ~70%
  const tempoV = velocityForVdot(vdot, 0.88); // Threshold ~88%
  const intervalV = velocityForVdot(vdot, 0.98); // VO2max ~98%

  const easySec = secPerKm(easyV);
  const longSec = secPerKm(longV);
  const tempoSec = secPerKm(tempoV);
  const intervalSec = secPerKm(intervalV);

  return {
    easy: formatPaceRange(easySec, 25),
    long: formatPaceRange(longSec, 20),
    tempo: formatPaceRange(tempoSec, 15),
    interval: formatPaceRange(intervalSec, 15),
    easySec: Math.round(easySec),
    longSec: Math.round(longSec),
    tempoSec: Math.round(tempoSec),
    intervalSec: Math.round(intervalSec),
    vdot: Math.round(vdot * 10) / 10,
  };
}
