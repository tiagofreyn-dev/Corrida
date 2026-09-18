// Integração com Gemini API (plano gratuito) via REST.
// Docs: https://ai.google.dev/gemini-api/docs

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** Lista modelos com generateContent disponíveis para a chave. */
export async function listModels(apiKey: string): Promise<string[]> {
  const res = await fetch(`${BASE}/models?key=${encodeURIComponent(apiKey)}`);
  if (!res.ok) throw new Error(`Falha ao conectar (${res.status}). Confira a chave.`);
  const data = await res.json();
  const models: { name: string; supportedGenerationMethods?: string[] }[] = data.models ?? [];
  return models
    .filter((m) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''));
}

/** Modelos estáveis com cota gratuita (ordem de preferência testada). */
const PREFERRED = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
];

/** Escolhe o melhor modelo gratuito estável da lista (evita preview/pro/2.x descontinuados). */
export function pickFlash(models: string[]): string {
  for (const p of PREFERRED) {
    if (models.includes(p)) return p;
  }
  // fallback: qualquer flash estável, sem preview nem especialidades (tts/imagem/áudio/omni)
  const ok = models.filter(
    (m) => /flash/i.test(m) && !/prev|preview|tts|image|transcribe|lyria|robotics|deep|nano|computer|antigravity|omni|2\.0|2\.5-flash$/i.test(m),
  );
  if (ok.length > 0) {
    ok.sort((a, b) => b.localeCompare(a));
    return ok[0];
  }
  return 'gemini-3.6-flash';
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function postChain(
  apiKey: string,
  model: string,
  generationConfig: object,
  system: string,
  contents: object[],
  onRetry?: (msg: string) => void,
): Promise<string> {
  const key = encodeURIComponent(apiKey);
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: system }] },
    contents,
    generationConfig,
  });
  // Cadeia de modelos: o escolhido + até 3 fallbacks (cada modelo tem cota própria)
  const chain = [model, ...PREFERRED.filter((m) => m !== model).slice(0, 3)];
  let lastErr = 'falha desconhecida';

  for (const m of chain) {
    let i429 = 0;
    let i503 = 0;
    for (;;) {
      let res: Response;
      try {
        res = await fetch(`${BASE}/models/${m}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
      } catch {
        lastErr = 'sem conexão com o Google';
        break;
      }
      if (res.ok) {
        const data = await res.json();
        const text: string = (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
        if (!text) throw new Error('A IA não retornou dados. Tente novamente.');
        return text;
      }
      if (res.status === 404) {
        lastErr = `modelo ${m} indisponível`;
        break; // tenta o próximo da cadeia
      }
      if (res.status === 400) {
        const t = await res.text().catch(() => '');
        throw new Error(`Requisição inválida (${t.slice(0, 160)}).`);
      }
      if (res.status === 429 && i429 < 2) {
        const wait = [15, 30][i429];
        i429++;
        onRetry?.(`⏳ Cota do ${m} no minuto. Nova tentativa em ${wait}s...`);
        await sleep(wait * 1000);
        continue;
      }
      if (res.status >= 500 && i503 < 2) {
        const wait = [10, 20][i503];
        i503++;
        onRetry?.(`⏳ Google sobrecarregado (erro ${res.status}). Nova tentativa em ${wait}s...`);
        await sleep(wait * 1000);
        continue;
      }
      lastErr = res.status === 429 ? `cota do ${m} esgotada` : `erro ${res.status} no ${m}`;
      if (m !== chain[chain.length - 1]) onRetry?.(`🔄 Trocando para o próximo modelo disponível...`);
      break;
    }
  }
  throw new Error(`IA indisponível no momento (${lastErr}). Aguarde alguns minutos e tente de novo.`);
}

async function generateJSON(
  apiKey: string,
  model: string,
  system: string,
  userText: string,
  schema: object,
  onRetry?: (msg: string) => void,
): Promise<unknown> {
  const text = await postChain(
    apiKey,
    model,
    { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.4 },
    system,
    [{ parts: [{ text: userText }] }],
    onRetry,
  );
  return JSON.parse(text);
}

/** Resposta em texto livre (chat de dúvidas). `history` = pares {role, text} anteriores. */
export async function generateText(
  apiKey: string,
  model: string,
  system: string,
  history: { role: 'user' | 'model'; text: string }[],
  question: string,
  onRetry?: (msg: string) => void,
): Promise<string> {
  const contents = [
    ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: question }] },
  ];
  return postChain(
    apiKey,
    model,
    { temperature: 0.7, maxOutputTokens: 1024 },
    system,
    contents,
    onRetry,
  );
}

export interface MealItem {
  name: string;
  qtyLabel: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

const MEAL_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          qtyLabel: { type: 'string' },
          kcal: { type: 'number' },
          protein: { type: 'number' },
          carbs: { type: 'number' },
          fat: { type: 'number' },
        },
        required: ['name', 'qtyLabel', 'kcal', 'protein', 'carbs', 'fat'],
      },
    },
  },
  required: ['items'],
};

/** Estima macros a partir de texto livre ("150g de arroz, 2 ovos..."). */
export async function estimateMeal(apiKey: string, model: string, text: string, onRetry?: (msg: string) => void): Promise<MealItem[]> {
  const system = `Você é um nutricionista esportivo brasileiro. Estime valores nutricionais com base na tabela TACO/Unicamp.
Retorne APENAS o JSON no schema. Seja realista com porções caseiras (colher de arroz ~50g, concha de feijão ~80g).
Valores de kcal/proteína/carboidrato/gordura para a quantidade TOTAL informada de cada item.`;
  const data = (await generateJSON(apiKey, model, system, text, MEAL_SCHEMA, onRetry)) as { items: MealItem[] };
  return (data.items ?? []).map((i) => ({
    name: String(i.name),
    qtyLabel: String(i.qtyLabel),
    kcal: Math.round(Number(i.kcal) || 0),
    protein: Math.round((Number(i.protein) || 0) * 10) / 10,
    carbs: Math.round((Number(i.carbs) || 0) * 10) / 10,
    fat: Math.round((Number(i.fat) || 0) * 10) / 10,
  }));
}

export interface CoachAIResult {
  score: number;
  headline: string;
  caloriesVerdict: string;
  points: string[];
  adjustments: string[];
  nextWeek: string;
}

const COACH_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'number' },
    headline: { type: 'string' },
    caloriesVerdict: { type: 'string' },
    points: { type: 'array', items: { type: 'string' } },
    adjustments: { type: 'array', items: { type: 'string' } },
    nextWeek: { type: 'string' },
  },
  required: ['score', 'headline', 'caloriesVerdict', 'points', 'adjustments', 'nextWeek'],
};

/** Análise do treinador com base no histórico real do atleta. */
export async function analyzeCoach(
  apiKey: string,
  model: string,
  payload: string,
  onRetry?: (msg: string) => void,
): Promise<CoachAIResult> {
  const system = `Você é um treinador de corrida e nutricionista esportivo brasileiro, direto e prático.
Analise os dados do atleta (perfil, plano semanal, check-ins com RPE 0-10, alimentação e água dos últimos 7 dias).
Retorne APENAS o JSON no schema, em português:
- score: 0-100 (aderência + controle de esforço + alimentação)
- headline: frase curta de impacto
- caloriesVerdict: diga se está excedendo, abaixo ou dentro da meta calórica/proteica e o efeito disso no objetivo corporal
- points: observações baseadas nos dados (cite números reais)
- adjustments: ações práticas para a próxima semana
- nextWeek: sugestão de estrutura da próxima semana (ex: "3 leves + 1 tempo + longão 12km") e se deve progredir, manter ou deload`;
  const data = (await generateJSON(apiKey, model, system, payload, COACH_SCHEMA, onRetry)) as CoachAIResult;
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(data.score) || 0))),
    headline: String(data.headline ?? ''),
    caloriesVerdict: String(data.caloriesVerdict ?? ''),
    points: (data.points ?? []).map(String),
    adjustments: (data.adjustments ?? []).map(String),
    nextWeek: String(data.nextWeek ?? ''),
  };
}
