import type { WorkoutEntry } from '../store/PlanContext';

export interface CoachVerdict {
  score: number; // 0-100
  status: 'excelente' | 'bom' | 'atencao' | 'alerta' | 'sem-dados';
  headline: string;
  points: string[];
  adjustments: string[];
}

/** Data local yyyy-mm-dd */
export function todayStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function last7(): string[] {
  return Array.from({ length: 7 }, (_, i) => todayStr(i - 6));
}

/**
 * Análise semanal estilo professor de corrida:
 * aderência + RPE médio + sinais de alerta → veredito e ajustes.
 */
export function analyzeWeek(all: WorkoutEntry[]): CoachVerdict {
  const days = new Set(last7());
  const week = all.filter((w) => days.has(w.date));

  if (week.length === 0) {
    return {
      score: 0,
      status: 'sem-dados',
      headline: 'Sem check-ins nos últimos 7 dias.',
      points: ['Registre seus treinos na aba Coach após cada sessão para eu te avaliar.'],
      adjustments: [],
    };
  }

  const done = week.filter((w) => w.done);
  const planned = week.length;
  const adherence = done.length / planned;
  const rpes = done.filter((w) => w.rpe > 0).map((w) => w.rpe);
  const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : 0;
  const maxRpe = rpes.length ? Math.max(...rpes) : 0;
  const easyHard = done.filter((w) => /leve|easy|regenerativo/i.test(w.title) && w.rpe >= 8);
  const missedLong = week.filter((w) => !w.done && /long/i.test(w.title));
  const streakMiss = week.slice(-3).every((w) => !w.done);

  let score = Math.round(adherence * 70 + (avgRpe > 0 ? Math.max(0, (10 - avgRpe) / 10) * 30 : 15));
  const points: string[] = [];
  const adjustments: string[] = [];
  let status: CoachVerdict['status'] = 'bom';
  let headline = '';

  points.push(`Aderência: ${done.length}/${planned} treinos (${Math.round(adherence * 100)}%).`);
  if (avgRpe > 0) points.push(`Esforço médio (RPE): ${avgRpe.toFixed(1)}/10.`);

  if (maxRpe >= 10) {
    status = 'alerta';
    score = Math.min(score, 35);
    headline = '🚨 Sinal vermelho: RPE 10 registrado.';
    points.push('RPE 10 significa esforço máximo — risco alto de lesão/overtraining.');
    adjustments.push('Deload imediato: 2 dias de descanso total + próxima semana só rodagem leve.');
    adjustments.push('Se houver dor (não dor muscular comum), procure avaliação antes de voltar aos tiros.');
  } else if (streakMiss && planned >= 3) {
    status = 'alerta';
    headline = '🚨 3 treinos seguidos perdidos.';
    points.push('Sequência de faltas quebra o ciclo de adaptação.');
    adjustments.push('Semana de retomada: 3 rodagens leves de 30min, sem tiros nem longão.');
  } else if (adherence >= 0.85 && avgRpe <= 7) {
    status = 'excelente';
    headline = '🔥 Excelente! Evolução consistente.';
    points.push('Alta aderência com esforço controlado = adaptação acontecendo.');
    adjustments.push('Pode progredir: +1 a 2km no próximo longão.');
    adjustments.push('Mantém os tiros no mesmo pace por mais 1 semana antes de acelerar.');
  } else if (adherence >= 0.6) {
    status = 'bom';
    headline = '👍 Bom ritmo, com ajustes finos.';
    if (easyHard.length > 0) {
      points.push(`${easyHard.length} rodagem(ns) leve(s) com RPE ≥ 8 — leve deveria ser ≤ 7.`);
      adjustments.push('Ritmo easy 15–20s/km mais lento. Leve de verdade: consegue conversar.');
    }
    if (missedLong.length > 0) {
      points.push('Longão perdido — é o treino mais importante da semana.');
      adjustments.push('Reponha com 70% da distância em ritmo easy, nunca dobrando o volume.');
    }
    if (!easyHard.length && !missedLong.length) adjustments.push('Mantém o plano. Foque em sono e proteína nos dias de descanso.');
  } else {
    status = 'atencao';
    headline = '⚠️ Aderência baixa — vamos simplificar.';
    points.push('Abaixo de 60% o corpo não acumula adaptação.');
    adjustments.push('Reduza a meta: 3 treinos/semana (2 leves + 1 longo curto).');
    adjustments.push('Reagende os dias para horários que você realmente consegue cumprir.');
  }

  if (avgRpe >= 8 && status !== 'alerta') {
    adjustments.push('RPE médio alto: adicione +1 dia de descanso ou troque 1 treino por caminhada.');
  }

  return { score, status, headline, points, adjustments };
}
