import type { BodyGoal, DayMacros } from '../types';

// Metas de macros por tipo de dia e objetivo corporal.
// Valores-base para referência de ~70kg; ajuste fino pode ser feito por peso real.
// Foco: dia pesado = +carbo; descanso = -kcal mantendo proteína alta.

interface MacroProfile {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

const BASE: Record<BodyGoal, Record<'pesado' | 'leve' | 'forca' | 'descanso', MacroProfile>> = {
  manter: {
    pesado: { kcal: 2600, protein: 140, carbs: 340, fat: 75 },
    leve: { kcal: 2300, protein: 140, carbs: 260, fat: 70 },
    forca: { kcal: 2400, protein: 160, carbs: 240, fat: 70 },
    descanso: { kcal: 2000, protein: 150, carbs: 180, fat: 65 },
  },
  hipertrofia: {
    pesado: { kcal: 2900, protein: 160, carbs: 380, fat: 80 },
    leve: { kcal: 2700, protein: 160, carbs: 320, fat: 75 },
    forca: { kcal: 2800, protein: 180, carbs: 300, fat: 75 },
    descanso: { kcal: 2500, protein: 170, carbs: 250, fat: 70 },
  },
  cutting: {
    pesado: { kcal: 2200, protein: 170, carbs: 250, fat: 60 },
    leve: { kcal: 2000, protein: 170, carbs: 190, fat: 60 },
    forca: { kcal: 2050, protein: 185, carbs: 170, fat: 60 },
    descanso: { kcal: 1800, protein: 175, carbs: 130, fat: 60 },
  },
};

export function macrosForDay(
  dayType: 'pesado' | 'leve' | 'forca' | 'descanso',
  bodyGoal: BodyGoal | null,
): DayMacros {
  const goal: BodyGoal = bodyGoal ?? 'manter';
  const m = BASE[goal][dayType];
  return { ...m };
}
