import type {
  DayPlan,
  GeneratedPlan,
  SessionKind,
  StrengthExercise,
  UserData,
  WeekDay,
  WeeklyVolume,
} from '../types';
import { calculatePaces, formatPace } from './paces';
import { macrosForDay } from './nutrition';

// Distância circular entre dois dias da semana (0-6), em dias.
function dayDistance(a: WeekDay, b: WeekDay): number {
  const d = Math.abs(a - b);
  return Math.min(d, 7 - d);
}

function volumeBaseKm(v: WeeklyVolume | null): { easy: number; long: number } {
  switch (v) {
    case '0-10':
      return { easy: 4, long: 8 };
    case '10-25':
      return { easy: 6, long: 12 };
    case '25-40':
      return { easy: 8, long: 16 };
    case '40+':
      return { easy: 10, long: 21 };
    default:
      return { easy: 5, long: 10 };
  }
}

const UPPER_A: StrengthExercise[] = [
  { name: 'Supino com halteres', sets: '4x', reps: '8-10', focus: 'superiores' },
  { name: 'Remada curvada', sets: '4x', reps: '8-10', focus: 'superiores' },
  { name: 'Desenvolvimento ombros', sets: '3x', reps: '10-12', focus: 'superiores' },
  { name: 'Prancha', sets: '3x', reps: '45s', focus: 'core' },
];

const UPPER_B: StrengthExercise[] = [
  { name: 'Puxada alta / Barra', sets: '4x', reps: '6-10', focus: 'superiores' },
  { name: 'Flexão de braço', sets: '3x', reps: '12-15', focus: 'superiores' },
  { name: 'Rosca + Tríceps testa', sets: '3x', reps: '10-12', focus: 'superiores' },
  { name: 'Abdominal bicicleta', sets: '3x', reps: '20', focus: 'core' },
];

const LEGS_LIGHT: StrengthExercise[] = [
  { name: 'Agachamento goblet leve', sets: '3x', reps: '12', focus: 'pernas' },
  { name: 'Afundo reverso', sets: '3x', reps: '10/ lado', focus: 'pernas' },
  { name: 'Ponte de glúteo', sets: '3x', reps: '15', focus: 'pernas' },
  { name: 'Panturrilha em pé', sets: '3x', reps: '15', focus: 'pernas' },
];

const CORE_ONLY: StrengthExercise[] = [
  { name: 'Prancha lateral', sets: '3x', reps: '30s/lado', focus: 'core' },
  { name: 'Dead bug', sets: '3x', reps: '10/lado', focus: 'core' },
  { name: 'Bird-dog', sets: '3x', reps: '10/lado', focus: 'core' },
  { name: 'Ponte de glúteo', sets: '2x', reps: '15', focus: 'core' },
];

function minToPaceLabel(secPerKm: number): string {
  return `${formatPace(secPerKm - 10)}–${formatPace(secPerKm + 10)} /km`;
}

/**
 * Gera a planilha semanal respeitando:
 * - Descanso total bloqueia o dia
 * - Long Run no dia fixo
 * - Tiros com ≥48h do Long Run
 * - Rodagens leves nos demais dias de corrida
 * - Musculação nos dias escolhidos; nunca perna pesada na véspera de tiros/longão
 */
export function generateCustomPlan(user: UserData): GeneratedPlan {
  const warnings: string[] = [];
  const totalRefSec = user.refTimeMin * 60 + user.refTimeSec;
  const paces = calculatePaces(user.refDistance ?? '5k', Math.max(totalRefSec, 600));

  const { easy, long } = volumeBaseKm(user.weeklyVolume);

  const rest = new Set<WeekDay>(user.restDays);
  const runSet = new Set<WeekDay>(user.runDays.filter((d) => !rest.has(d)));
  const liftSet = new Set<WeekDay>(user.strengthDays.filter((d) => !rest.has(d)));

  if (user.longRunDay != null && !runSet.has(user.longRunDay) && !rest.has(user.longRunDay)) {
    warnings.push('Dia do Long Run não estava nos dias de corrida — ele foi adicionado automaticamente.');
    runSet.add(user.longRunDay);
  }

  const longDay: WeekDay | null =
    user.longRunDay != null && !rest.has(user.longRunDay) ? user.longRunDay : null;

  // ── Escolha do dia de tiros: dia de corrida com maior distância do longão (≥2 dias) ──
  let intervalDay: WeekDay | null = null;
  if (longDay != null) {
    const candidates = [...runSet].filter((d) => d !== longDay && dayDistance(d, longDay) >= 2);
    if (candidates.length > 0) {
      candidates.sort((a, b) => dayDistance(b, longDay) - dayDistance(a, longDay));
      intervalDay = candidates[0];
    } else {
      // fallback: qualquer outro dia de corrida
      const others = [...runSet].filter((d) => d !== longDay);
      if (others.length > 0) {
        intervalDay = others[0];
        warnings.push('Não foi possível manter 48h entre Tiros e Long Run com os dias disponíveis — ajuste os dias de corrida para melhor recuperação.');
      }
    }
  } else if (runSet.size > 0) {
    intervalDay = [...runSet][0];
  }

  // ── Dia de tempo run (limiar): outro dia de corrida, se houver ──
  let tempoDay: WeekDay | null = null;
  const remaining = [...runSet].filter((d) => d !== longDay && d !== intervalDay);
  if (remaining.length >= 2) {
    // com 4+ dias de corrida, adiciona tempo run
    tempoDay = remaining[Math.floor(remaining.length / 2)];
  } else if (remaining.length === 1 && runSet.size >= 4) {
    tempoDay = remaining[0];
  }

  // Primeiros 5k / condicionamento: sem intervalado pesado se volume baixo
  if ((user.mainGoal === 'primeiros-5k' || user.mainGoal === 'condicionamento') && (user.weeklyVolume === '0-10' || user.weeklyVolume == null)) {
    if (intervalDay != null && tempoDay == null) {
      // converte interval em tempo run leve / fartlek para iniciante
      tempoDay = intervalDay;
      intervalDay = null;
      warnings.push('Para o seu nível, o treino intenso foi adaptado para um Tempo Run progressivo em vez de tiros de VO2max.');
    }
  }

  const order: WeekDay[] = [1, 2, 3, 4, 5, 6, 0];
  const week: DayPlan[] = [];

  // Alternância de foco de musculação
  let upperToggle = 0;

  for (const wd of order) {
    if (rest.has(wd)) {
      week.push({
        weekday: wd,
        kind: 'rest',
        title: 'Descanso total',
        description: 'Recuperação completa. Sono, hidratação e mobilidade leve.',
        blocks: [],
        distanceKm: 0,
        strength: null,
        strengthFocus: null,
        macros: macrosForDay('descanso', user.bodyGoal),
        dayType: 'descanso',
      });
      continue;
    }

    const isLong = wd === longDay;
    const isInterval = wd === intervalDay;
    const isTempo = wd === tempoDay;
    const isRun = runSet.has(wd) || isLong || isInterval || isTempo;
    const isLift = liftSet.has(wd);

    let kind: SessionKind = 'rest';
    let title = 'Livre / Mobilidade';
    let description = 'Dia livre — caminhada ou mobilidade opcional.';
    let blocks: DayPlan['blocks'] = [];
    let distanceKm = 0;
    let dayType: DayPlan['dayType'] = 'descanso';

    if (isInterval) {
      kind = 'interval';
      title = 'Tiros — VO2max';
      const wu = 2, cd = 2;
      const reps = user.weeklyVolume === '40+' ? 8 : user.weeklyVolume === '25-40' ? 6 : 5;
      const repKm = 0.4;
      distanceKm = Math.round((wu + cd + reps * repKm) * 10) / 10;
      description = `${reps}x ${repKm * 1000}m forte com 90s trote entre tiros.`;
      blocks = [
        { label: 'Aquecimento', distanceKm: wu, durationMin: Math.round(wu * paces.easySec / 60), targetPace: paces.easy },
        { label: 'Principal', distanceKm: Math.round(reps * repKm * 10) / 10, durationMin: Math.round(reps * repKm * paces.intervalSec / 60) + reps * 2, targetPace: paces.interval },
        { label: 'Desaquecimento', distanceKm: cd, durationMin: Math.round(cd * paces.easySec / 60), targetPace: paces.easy },
      ];
      dayType = 'pesado';
    } else if (isLong) {
      kind = 'long';
      title = 'Long Run';
      distanceKm = long;
      description = `Rodagem longa sustentável de ${long}km. Hidratação a cada 25–30min.`;
      const wuKm = 1;
      blocks = [
        { label: 'Aquecimento', distanceKm: wuKm, durationMin: Math.round(wuKm * paces.easySec / 60), targetPace: paces.easy },
        { label: 'Principal', distanceKm: long - wuKm - 1, durationMin: Math.round((long - wuKm - 1) * paces.longSec / 60), targetPace: paces.long },
        { label: 'Desaquecimento', distanceKm: 1, durationMin: Math.round(1 * paces.easySec / 60), targetPace: paces.easy },
      ];
      dayType = 'pesado';
    } else if (isTempo) {
      kind = 'tempo';
      title = intervalDay == null ? 'Tempo Run progressivo' : 'Tempo Run — Limiar';
      const tempoKm = 4;
      distanceKm = tempoKm + 3;
      description = `2km aquecimento + ${tempoKm}km em ritmo de limiar + 1km solto.`;
      blocks = [
        { label: 'Aquecimento', distanceKm: 2, durationMin: Math.round(2 * paces.easySec / 60), targetPace: paces.easy },
        { label: 'Principal', distanceKm: tempoKm, durationMin: Math.round(tempoKm * paces.tempoSec / 60), targetPace: paces.tempo },
        { label: 'Desaquecimento', distanceKm: 1, durationMin: Math.round(1 * paces.easySec / 60), targetPace: paces.easy },
      ];
      dayType = 'pesado';
    } else if (isRun) {
      kind = 'easy';
      title = 'Rodagem leve — Easy';
      distanceKm = easy;
      description = `Rodagem regenerativa de ${easy}km em ritmo confortável (consegue conversar).`;
      blocks = [
        { label: 'Principal', distanceKm: easy, durationMin: Math.round(easy * paces.easySec / 60), targetPace: paces.easy },
      ];
      dayType = 'leve';
    }

    // ── Musculação ──
    let strength: StrengthExercise[] | null = null;
    let strengthFocus: DayPlan['strengthFocus'] = null;

    if (isLift) {
      // Regra estrita: nunca perna pesada na véspera de tiros ou longão.
      const nextDay: WeekDay = ((wd + 1) % 7) as WeekDay;
      const eveOfHard = nextDay === longDay || nextDay === intervalDay;
      if (eveOfHard) {
        strength = upperToggle % 2 === 0 ? UPPER_A : UPPER_B;
        strengthFocus = 'superiores';
        upperToggle++;
      } else {
        // Alterna superiores / perna leve (nunca prescrevemos perna pesada no app pessoal)
        if (upperToggle % 3 === 2) {
          strength = LEGS_LIGHT;
          strengthFocus = 'pernas';
        } else {
          strength = upperToggle % 2 === 0 ? UPPER_A : UPPER_B;
          strengthFocus = 'superiores';
        }
        upperToggle++;
      }
      if (kind === 'rest') {
        kind = 'easy'; // dia só de força ainda conta como estímulo; mantém cor roxa via strength
        title = 'Musculação';
        description = 'Sessão de força + core. Sem corrida.';
        dayType = 'forca';
      } else if (dayType === 'leve') {
        dayType = user.allowSameDayRunLift || true ? 'leve' : 'leve';
        title += ' + Musculação';
        description += ' Força após a corrida (ou em turno separado).';
      } else if (dayType === 'pesado') {
        title += ' + Musculação (superiores/core)';
        description += ' Apenas superiores/core — sem perna pesada em dia forte.';
        // força extra não muda macro (já é dia pesado)
      }
      if (dayType === 'descanso') dayType = 'forca';
    }

    // Se dia de força pura sem corrida
    if (!isRun && isLift && kind === 'easy' && distanceKm === 0) {
      // mantém
    }

    // Macros finais por tipo de dia
    const macros = macrosForDay(dayType === 'descanso' ? 'descanso' : dayType, user.bodyGoal);

    // Core complementar em dias easy sem força
    if (!strength && (kind === 'easy' || kind === 'long')) {
      strength = CORE_ONLY;
      strengthFocus = 'core';
    }

    if (!isRun && !isLift) {
      kind = 'rest';
      title = 'Descanso / Livre';
      description = 'Sem treino agendado. Mobilidade opcional.';
      blocks = [];
      distanceKm = 0;
      strength = null;
      strengthFocus = null;
      dayType = 'descanso';
      week.push({
        weekday: wd, kind, title, description, blocks, distanceKm,
        strength, strengthFocus,
        macros: macrosForDay('descanso', user.bodyGoal),
        dayType,
      });
      continue;
    }

    week.push({
      weekday: wd, kind, title, description, blocks, distanceKm,
      strength, strengthFocus, macros, dayType,
    });
  }

  // Validação: conflito mesmo dia quando usuário pediu separar
  if (!user.allowSameDayRunLift) {
    const conflicts = week.filter((d) => d.distanceKm > 0 && d.strength && d.strengthFocus !== 'core');
    if (conflicts.length > 0) {
      warnings.push('Você pediu para separar corrida e musculação, mas alguns dias coincidiram por falta de dias livres. Considere liberar mais dias ou permitir mesmo dia.');
    }
  }

  return {
    paces: {
      easy: paces.easy,
      long: paces.long,
      tempo: paces.tempo,
      interval: paces.interval,
      easySec: paces.easySec,
      longSec: paces.longSec,
      tempoSec: paces.tempoSec,
      intervalSec: paces.intervalSec,
      vdot: paces.vdot,
    },
    week,
    warnings,
  };
}

// helper re-export p/ UI
export { minToPaceLabel };
