import { useMemo, useState } from 'react';
import { analyzeWeek, todayStr } from '../lib/coach';
import { analyzeCoach, type CoachAIResult } from '../lib/gemini';
import type { PlanOverride } from '../types';
import { usePlan } from '../store/PlanContext';

const RPE_LABELS: Record<number, string> = {  0: 'Nada — faltei ao treino',
  1: 'Muito, muito leve',
  2: 'Leve',
  3: 'Moderado-leve',
  4: 'Moderado',
  5: 'Moderado-forte',
  6: 'Forte',
  7: 'Muito forte',
  8: 'Muito, muito forte',
  9: 'Quase máximo',
  10: 'Máximo — exaustão',
};

export default function Coach() {
  const { plan, workouts, addWorkout, removeWorkout, user, setUser, foods, water, aiKey, aiModel } = usePlan();
  const today = todayStr();
  const [title, setTitle] = useState('');
  const [done, setDone] = useState(true);
  const [dist, setDist] = useState('');
  const [time, setTime] = useState('');
  const [rpe, setRpe] = useState(6);
  const [notes, setNotes] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState<CoachAIResult | null>(null);

  const verdict = useMemo(() => analyzeWeek(workouts), [workouts]);

  const todayWd = ([1, 2, 3, 4, 5, 6, 0] as const)[(new Date().getDay() + 6) % 7];
  const plannedToday = plan?.week.find((d) => d.weekday === todayWd);

  const submit = () => {
    addWorkout({
      date: today,
      title: title.trim() || plannedToday?.title || 'Treino livre',
      done,
      distanceKm: Number(dist) || 0,
      timeMin: Number(time) || 0,
      rpe: done ? rpe : 0,
      notes: notes.trim(),
    });
    setTitle(''); setDist(''); setTime(''); setNotes(''); setRpe(6); setDone(true);
  };

  const runAiCoach = async () => {
    if (!aiKey || !aiModel) { setAiError('Configure sua chave do Gemini na aba Alimentação (cartão "IA do app").'); return; }
    setAiBusy(true); setAiError('');
    try {
      const last14 = [...workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
      const days: string[] = Array.from({ length: 7 }, (_, i) => todayStr(i - 6));
      const nutrition = days.map((d) => {
        const fs = foods.filter((f) => f.date === d);
        const t = fs.reduce((a, f) => ({ kcal: a.kcal + f.kcal, protein: a.protein + f.protein, carbs: a.carbs + f.carbs, fat: a.fat + f.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
        return { date: d, itens: fs.length, ...t, aguaMl: water[d] ?? 0 };
      });
      const payload = JSON.stringify({
        perfil: {
          objetivo: user.mainGoal, prova: user.raceDistance, dataProva: user.raceDate,
          referencia: `${user.refDistance} em ${user.refTimeMin}:${String(user.refTimeSec).padStart(2, '0')}`,
          volume: user.weeklyVolume, objetivoCorporal: user.bodyGoal, dieta: user.dietPref,
        },
        planoSemanal: plan?.week.map((w) => ({ dia: w.weekday, treino: w.title, km: w.distanceKm, macros: w.macros })) ?? [],
        paces: plan?.paces ?? null,
        checkins14dias: last14,
        nutricao7dias: nutrition,
      });
      const result = await analyzeCoach(aiKey, aiModel, payload, (m) => setAiError(m));
      setAiError('');
      setAiResult(result);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Falha na análise.');
    } finally {
      setAiBusy(false);
    }
  };

  const statusColor =
    verdict.status === 'excelente' ? 'var(--primary)' :
    verdict.status === 'bom' ? 'var(--easy)' :
    verdict.status === 'atencao' ? 'var(--tempo)' :
    verdict.status === 'alerta' ? 'var(--hard)' : 'var(--rest)';

  return (
    <div>
      <div className="card" style={{ borderLeft: `6px solid ${statusColor}` }}>
        <div className="today-head">
          <span className="badge">Professor · análise dos últimos 7 dias · nota {verdict.score}/100</span>
          <h2>{verdict.headline}</h2>
        </div>
        {verdict.points.map((p, i) => <p key={i}>• {p}</p>)}
        {verdict.adjustments.length > 0 && (
          <div className="add-box">
            <strong>📋 Ajustes para a próxima semana:</strong>
            {verdict.adjustments.map((a, i) => <p key={i}>→ {a}</p>)}
          </div>
        )}
      </div>

      <div className="card">
        <h3>✨ Análise da IA (com seus dados reais)</h3>
        <p className="hint">Cruza perfil + plano + check-ins + RPEs + alimentação e água da semana, diz se está excedendo nas calorias e sugere a próxima semana de treino.</p>
        <button className="btn primary" disabled={aiBusy} onClick={runAiCoach}>
          {aiBusy ? 'Analisando...' : 'Pedir análise da IA ✨'}
        </button>
        {aiError && <p className="error">{aiError}</p>}
        {aiResult && (
          <div className="add-box">
            <span className="badge">Nota IA: {aiResult.score}/100</span>
            <h2 style={{ margin: '4px 0' }}>{aiResult.headline}</h2>
            <p><strong>🔥 Calorias:</strong> {aiResult.caloriesVerdict}</p>
            {aiResult.points.map((p, i) => <p key={i}>• {p}</p>)}
            <strong>📋 Ajustes:</strong>
            {aiResult.adjustments.map((a, i) => <p key={i}>→ {a}</p>)}
            <strong>📅 Próxima semana:</strong>
            <p>{aiResult.nextWeek}</p>
            <AjusteBox result={aiResult} />
          </div>
        )}
      </div>

      {user.coachOverride && (
        <div className="card" style={{ borderLeft: '6px solid var(--lift)' }}>
          <p>🤖 <strong>Ajuste do coach ativo:</strong> {describeOverride(user.coachOverride)}</p>
          <button className="btn ghost sm" onClick={() => setUser({ coachOverride: null })}>Desfazer (voltar ao plano original)</button>
        </div>
      )}

      <div className="card">
        <h3>✅ Check-in do treino de hoje</h3>        {plannedToday && (
          <p className="hint">Previsto hoje: <strong>{plannedToday.title}</strong>{plannedToday.distanceKm > 0 ? ` · ${plannedToday.distanceKm}km` : ''}</p>
        )}
        <div className="field-row">
          <label>Treino (ou aceite a sugestão do plano)</label>
          <input className="text-input" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder={plannedToday?.title ?? 'Ex: Rodagem leve'} />
        </div>
        <div className="field-row">
          <label className="check">
            <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} />
            Concluí o treino
          </label>
        </div>
        {done && (
          <>
            <div className="field-row inline">
              <div><label>Distância (km)</label><input type="number" min={0} value={dist} onChange={(e) => setDist(e.target.value)} /></div>
              <div><label>Tempo (min)</label><input type="number" min={0} value={time} onChange={(e) => setTime(e.target.value)} /></div>
            </div>
            <div className="field-row">
              <label>Sensação de esforço (RPE): {rpe} — {RPE_LABELS[rpe]}</label>
              <input type="range" min={1} max={10} value={rpe} onChange={(e) => setRpe(Number(e.target.value))} className="rpe-slider" />
              <div className="day-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button key={n} onClick={() => setRpe(n)} className={`day-btn rpe${rpe === n ? ' active' : ''}`}>{n}</button>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="field-row">
          <label>Observações (dor? sono? clima?)</label>
          <input className="text-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: dor no joelho no km 4, noite mal dormida" />
        </div>
        <button className="btn primary" onClick={submit}>Registrar check-in ✓</button>
      </div>

      <div className="card">
        <h3>📜 Histórico</h3>
        {workouts.length === 0 && <p className="hint">Nenhum check-in ainda. Registre o primeiro acima.</p>}
        {workouts.map((w) => (
          <div key={w.id} className="log-row">
            <div>
              <strong>{w.date}</strong> · {w.done ? '✅' : '❌'} {w.title}
              <small>
                {w.done && w.distanceKm > 0 ? ` · ${w.distanceKm}km` : ''}
                {w.done && w.timeMin > 0 ? ` em ${w.timeMin}min` : ''}
                {w.done ? ` · RPE ${w.rpe}` : ''}
                {w.notes ? ` · “${w.notes}”` : ''}
              </small>
            </div>
            <button className="btn ghost sm" onClick={() => removeWorkout(w.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function paceDeltaLabel(v: number): string {
  return `${v > 0 ? '+' : ''}${v}s/km`;
}

/** Texto legível do ajuste (usado no banner e no botão aplicar). */
export function describeOverride(ov: PlanOverride): string {
  const parts: string[] = [];
  if (ov.deload) parts.push('semana de deload (sem tiros, longão 70%)');
  if (ov.longRunDeltaKm) parts.push(`longão ${ov.longRunDeltaKm > 0 ? '+' : ''}${ov.longRunDeltaKm}km`);
  if (ov.easyPaceDeltaSec) parts.push(`easy ${paceDeltaLabel(ov.easyPaceDeltaSec)}`);
  if (ov.tempoPaceDeltaSec) parts.push(`tempo ${paceDeltaLabel(ov.tempoPaceDeltaSec)}`);
  if (ov.intervalPaceDeltaSec) parts.push(`tiros ${paceDeltaLabel(ov.intervalPaceDeltaSec)}`);
  const base = parts.length > 0 ? parts.join(' · ') : 'manter plano';
  return ov.note ? `${base} — ${ov.note}` : base;
}

/** Botão "Aplicar ao meu plano" dentro do resultado da IA. */
function AjusteBox({ result }: { result: CoachAIResult }) {
  const { user, setUser } = usePlan();
  const aj = result.ajuste;
  const has = aj.longRunDeltaKm !== 0 || aj.easyPaceDeltaSec !== 0 ||
    aj.tempoPaceDeltaSec !== 0 || aj.intervalPaceDeltaSec !== 0 || aj.deload;

  if (!has) return <p className="hint">✅ Plano mantido — nenhum ajuste necessário esta semana.</p>;

  const ov: PlanOverride = {
    ...(aj.longRunDeltaKm !== 0 ? { longRunDeltaKm: aj.longRunDeltaKm } : {}),
    ...(aj.easyPaceDeltaSec !== 0 ? { easyPaceDeltaSec: aj.easyPaceDeltaSec } : {}),
    ...(aj.tempoPaceDeltaSec !== 0 ? { tempoPaceDeltaSec: aj.tempoPaceDeltaSec } : {}),
    ...(aj.intervalPaceDeltaSec !== 0 ? { intervalPaceDeltaSec: aj.intervalPaceDeltaSec } : {}),
    ...(aj.deload ? { deload: true } : {}),
    note: aj.note,
  };

  if (user.coachOverride != null) {
    return (
      <div>
        <p className="hint">✅ Ajuste aplicado à planilha (vale no PC e no celular).</p>
        <button className="btn ghost sm" onClick={() => setUser({ coachOverride: null })}>Desfazer</button>
      </div>
    );
  }

  return (
    <div className="add-box">
      <p>🤖 A IA sugere aplicar: <strong>{describeOverride(ov)}</strong></p>
      <button className="btn primary" onClick={() => setUser({ coachOverride: ov })}>
        Aplicar ao meu plano ✓
      </button>
    </div>
  );
}
