// Banco de alimentos (valores aprox. por 100g, fontes: TACO/Unicamp).
// Para itens por unidade, `perUnit` = peso médio em gramas.

export interface Food {
  id: string;
  name: string;
  perUnit?: number; // g por unidade (ovo, banana, pão...)
  unitLabel?: string;
  kcal: number; // por 100g
  protein: number;
  carbs: number;
  fat: number;
}

export const FOODS: Food[] = [
  // — Básicos / carboidratos —
  { id: 'arroz', name: 'Arroz branco cozido', kcal: 128, protein: 2.5, carbs: 28, fat: 0.2 },
  { id: 'arroz-int', name: 'Arroz integral cozido', kcal: 124, protein: 2.6, carbs: 26, fat: 1 },
  { id: 'feijao', name: 'Feijão carioca cozido', kcal: 76, protein: 4.8, carbs: 14, fat: 0.5 },
  { id: 'feijao-preto', name: 'Feijão preto cozido', kcal: 77, protein: 4.5, carbs: 14, fat: 0.5 },
  { id: 'macarrao', name: 'Macarrão cozido', kcal: 131, protein: 4.4, carbs: 26, fat: 0.6 },
  { id: 'batata', name: 'Batata inglesa cozida', kcal: 86, protein: 1.8, carbs: 20, fat: 0.1 },
  { id: 'batata-doce', name: 'Batata-doce cozida', kcal: 89, protein: 1.3, carbs: 21, fat: 0.1 },
  { id: 'mandioca', name: 'Mandioca cozida', kcal: 125, protein: 0.8, carbs: 30, fat: 0.2 },
  { id: 'pao', name: 'Pão francês', perUnit: 50, unitLabel: 'un', kcal: 300, protein: 8, carbs: 58, fat: 3.1 },
  { id: 'pao-forma', name: 'Pão de forma (fatia)', perUnit: 25, unitLabel: 'fatia', kcal: 260, protein: 9, carbs: 50, fat: 3 },
  { id: 'tapioca', name: 'Tapioca (col. sopa cheia)', perUnit: 20, unitLabel: 'col sopa', kcal: 340, protein: 0.5, carbs: 87, fat: 0 },
  { id: 'aveia', name: 'Aveia em flocos', kcal: 394, protein: 13.9, carbs: 66, fat: 8.5 },
  { id: 'granola', name: 'Granola', kcal: 440, protein: 10, carbs: 62, fat: 18 },
  { id: 'cuscuz', name: 'Cuscuz de milho cozido', kcal: 112, protein: 2.5, carbs: 24, fat: 0.5 },
  // — Proteínas —
  { id: 'frango', name: 'Frango grelhado (peito)', kcal: 159, protein: 32, carbs: 0, fat: 3 },
  { id: 'patinho', name: 'Patinho grelhado', kcal: 220, protein: 33, carbs: 0, fat: 9 },
  { id: 'ovo', name: 'Ovo cozido', perUnit: 50, unitLabel: 'un', kcal: 146, protein: 13, carbs: 1.1, fat: 9.5 },
  { id: 'ovo-frito', name: 'Ovo frito', perUnit: 55, unitLabel: 'un', kcal: 190, protein: 13, carbs: 1, fat: 15 },
  { id: 'atum', name: 'Atum em água (lata)', perUnit: 120, unitLabel: 'lata', kcal: 108, protein: 24, carbs: 0, fat: 1 },
  { id: 'tilapia', name: 'Tilápia grelhada', kcal: 128, protein: 26, carbs: 0, fat: 2.7 },
  { id: 'whey', name: 'Whey protein (dose)', perUnit: 30, unitLabel: 'dose', kcal: 400, protein: 80, carbs: 8, fat: 6 },
  { id: 'frango-desf', name: 'Frango desfiado cozido', kcal: 150, protein: 30, carbs: 0, fat: 3 },
  // — Laticínios —
  { id: 'leite', name: 'Leite integral (200ml)', perUnit: 200, unitLabel: 'copo', kcal: 60, protein: 3.2, carbs: 4.8, fat: 3.2 },
  { id: 'leite-desn', name: 'Leite desnatado (200ml)', perUnit: 200, unitLabel: 'copo', kcal: 34, protein: 3.4, carbs: 5, fat: 0.1 },
  { id: 'iogurte', name: 'Iogurte natural', kcal: 51, protein: 3.3, carbs: 4.5, fat: 2.5 },
  { id: 'iogurte-prot', name: 'Iogurte proteico (pote)', perUnit: 170, unitLabel: 'pote', kcal: 90, protein: 15, carbs: 6, fat: 0 },
  { id: 'queijo-minas', name: 'Queijo minas (fatia)', perUnit: 30, unitLabel: 'fatia', kcal: 260, protein: 17, carbs: 3, fat: 20 },
  { id: 'mussarela', name: 'Mussarela (fatia)', perUnit: 20, unitLabel: 'fatia', kcal: 320, protein: 22, carbs: 2, fat: 25 },
  // — Frutas —
  { id: 'banana', name: 'Banana prata', perUnit: 70, unitLabel: 'un', kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { id: 'maca', name: 'Maçã', perUnit: 130, unitLabel: 'un', kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { id: 'laranja', name: 'Laranja', perUnit: 150, unitLabel: 'un', kcal: 47, protein: 0.9, carbs: 12, fat: 0.1 },
  { id: 'mamao', name: 'Mamão papaia (fatia)', perUnit: 150, unitLabel: 'fatia', kcal: 43, protein: 0.5, carbs: 11, fat: 0.1 },
  { id: 'morango', name: 'Morango', kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
  { id: 'uva', name: 'Uva', kcal: 67, protein: 0.6, carbs: 17, fat: 0.4 },
  { id: 'abacate', name: 'Abacate', kcal: 160, protein: 2, carbs: 8.5, fat: 14.7 },
  // — Gorduras boas / extras —
  { id: 'azeite', name: 'Azeite (col. sopa)', perUnit: 8, unitLabel: 'col sopa', kcal: 884, protein: 0, carbs: 0, fat: 100 },
  { id: 'amendoim', name: 'Amendoim torrado', kcal: 567, protein: 26, carbs: 16, fat: 49 },
  { id: 'castanha', name: 'Castanha-do-pará (un)', perUnit: 5, unitLabel: 'un', kcal: 656, protein: 14, carbs: 12, fat: 66 },
  { id: 'pasta-amendoim', name: 'Pasta de amendoim (col. sopa)', perUnit: 15, unitLabel: 'col sopa', kcal: 588, protein: 25, carbs: 20, fat: 50 },
  // — Pré/pós-treino e outros —
  { id: 'rapadura', name: 'Rapadura (pedaço)', perUnit: 30, unitLabel: 'pedaço', kcal: 354, protein: 0.4, carbs: 91, fat: 0 },
  { id: 'gel', name: 'Gel de carboidrato (sachê)', perUnit: 30, unitLabel: 'sachê', kcal: 300, protein: 0, carbs: 75, fat: 0 },
  { id: 'acai', name: 'Açaí puro sem xarope', kcal: 58, protein: 0.8, carbs: 6, fat: 3.9 },
  { id: 'suco-laranja', name: 'Suco de laranja (200ml)', perUnit: 200, unitLabel: 'copo', kcal: 45, protein: 0.7, carbs: 10, fat: 0.1 },
  { id: 'cafe-leite', name: 'Café com leite e açúcar (xíc)', perUnit: 150, unitLabel: 'xíc', kcal: 55, protein: 2.5, carbs: 9, fat: 1.5 },
  { id: 'pizza', name: 'Pizza mussarela (fatia)', perUnit: 100, unitLabel: 'fatia', kcal: 270, protein: 11, carbs: 33, fat: 10 },
  { id: 'hamburger', name: 'Hambúrguer artesanal (un)', perUnit: 200, unitLabel: 'un', kcal: 280, protein: 15, carbs: 22, fat: 15 },
  { id: 'chocolate', name: 'Chocolate ao leite', kcal: 540, protein: 7, carbs: 59, fat: 31 },
  { id: 'sorvete', name: 'Sorvete cremoso (bola)', perUnit: 60, unitLabel: 'bola', kcal: 200, protein: 3.5, carbs: 24, fat: 11 },
];

/** Converte quantidade informada (g ou unidades) para macros. */
export function calcFoodMacros(food: Food, qty: number, mode: 'g' | 'un'): { kcal: number; protein: number; carbs: number; fat: number; grams: number } {
  const grams = mode === 'un' && food.perUnit ? qty * food.perUnit : qty;
  const f = grams / 100;
  const r = (n: number) => Math.round(n * 10) / 10;
  return {
    kcal: Math.round(food.kcal * f),
    protein: r(food.protein * f),
    carbs: r(food.carbs * f),
    fat: r(food.fat * f),
    grams: Math.round(grams),
  };
}
