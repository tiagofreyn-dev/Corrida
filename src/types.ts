// ── Tipos centrais do app ──────────────────────────────────────────────

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Dom … 6=Sáb

export const WEEK_DAYS: { value: WeekDay; short: string; full: string }[] = [
  { value: 1, short: 'Seg', full: 'Segunda' },
  { value: 2, short: 'Ter', full: 'Terça' },
  { value: 3, short: 'Qua', full: 'Quarta' },
  { value: 4, short: 'Qui', full: 'Quinta' },
  { value: 5, short: 'Sex', full: 'Sexta' },
  { value: 6, short: 'Sáb', full: 'Sábado' },
  { value: 0, short: 'Dom', full: 'Domingo' },
];

export type MainGoal =
  | 'primeiros-5k'
  | 'baixar-tempo'
  | 'condicionamento'
  | 'prova-marcada';

export type RaceDistance = '5k' | '10k' | '21k' | '42k';

export type WeeklyVolume = '0-10' | '10-25' | '25-40' | '40+';

export type BodyGoal = 'manter' | 'hipertrofia' | 'cutting';
export type DietPref = 'onivoro' | 'vegetariano' | 'vegano' | 'lowcarb';

/** Ajuste aplicado pelo coach IA (botão "Aplicar") — respeitado pelo gerador. */
export interface PlanOverride {
  longRunDeltaKm?: number; // ex: +2 ou -3 (mín. 5km no total)
  easyPaceDeltaSec?: number; // + = mais lento (ex: +15), - = mais rápido
  tempoPaceDeltaSec?: number;
  intervalPaceDeltaSec?: number;
  deload?: boolean; // semana leve: sem tiros, longão 70%
  note?: string; // motivo resumido exibido no dashboard
}

export interface UserData {
  // 1. Objetivo
  mainGoal: MainGoal | null;
  raceDistance: RaceDistance | null; // p/ baixar-tempo e prova-marcada
  raceDate: string | null; // ISO yyyy-mm-dd
  // 2. Nível
  refDistance: '5k' | '10k' | null;
  refTimeMin: number; // minutos
  refTimeSec: number; // segundos (0-59)
  weeklyVolume: WeeklyVolume | null;
  // 3. Corrida
  runDays: WeekDay[];
  longRunDay: WeekDay | null;
  // 4. Musculação
  strengthDays: WeekDay[];
  allowSameDayRunLift: boolean; // true = permite mesmo dia
  // 5. Descanso
  restDays: WeekDay[];
  // 6. Nutrição
  bodyGoal: BodyGoal | null;
  dietPref: DietPref | null;
  // Ajuste do coach IA (null = plano original)
  coachOverride: PlanOverride | null;
}

export const initialUserData: UserData = {
  mainGoal: null,
  raceDistance: null,
  raceDate: null,
  refDistance: '5k',
  refTimeMin: 30,
  refTimeSec: 0,
  weeklyVolume: null,
  runDays: [],
  longRunDay: null,
  strengthDays: [],
  allowSameDayRunLift: false,
  restDays: [],
  bodyGoal: null,
  dietPref: null,
  coachOverride: null,
};

// ── Plano gerado ────────────────────────────────────────────────────────

export type SessionKind =
  | 'rest'
  | 'easy'
  | 'long'
  | 'tempo'
  | 'interval';

export interface WorkoutBlock {
  label: string; // "Aquecimento" | "Principal" | "Desaquecimento"
  distanceKm: number;
  durationMin: number;
  targetPace: string; // "6:30–7:00 /km"
}

export interface StrengthExercise {
  name: string;
  sets: string;
  reps: string;
  focus: 'pernas' | 'superiores' | 'core' | 'full';
}

export interface DayPlan {
  weekday: WeekDay;
  kind: SessionKind;
  title: string;
  description: string;
  blocks: WorkoutBlock[];
  distanceKm: number;
  strength: StrengthExercise[] | null;
  strengthFocus: 'pernas' | 'superiores' | 'core' | 'full' | null;
  macros: DayMacros;
  dayType: 'pesado' | 'leve' | 'forca' | 'descanso';
}

export interface PaceTable {
  easy: string;
  long: string;
  tempo: string;
  interval: string;
  /** seg/km numéricos (média) para cálculos internos */
  easySec: number;
  longSec: number;
  tempoSec: number;
  intervalSec: number;
  vdot: number;
}

export interface DayMacros {
  kcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
}

export interface GeneratedPlan {
  paces: PaceTable;
  week: DayPlan[]; // 7 dias, ordenado Seg→Dom ou Dom→Sáb
  warnings: string[];
}
