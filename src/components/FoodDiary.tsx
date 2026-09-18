import { useState } from 'react';
import { estimateMeal, type MealItem } from '../lib/gemini';
import { todayStr } from '../lib/coach';
import { usePlan } from '../store/PlanContext';
import IaSettings from './IaSettings';

function Bar({ value, goal, color }: { value: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div className="meter">
      <div className="meter-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function FoodDiary() {
  const { plan, foods, addFood, removeFood, water, addWater, waterGoal, setWaterGoal, aiKey, aiModel } = usePlan();
  const today = todayStr();
  // IA
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiItems, setAiItems] = useState<MealItem[]>([]);

  const runAiEstimate = async () => {
    if (!aiText.trim()) return;
    if (!aiKey || !aiModel) { setAiError('Configure sua chave do Gemini no cartão "IA do app" abaixo.'); return; }
    setAiBusy(true); setAiError('');
    try {
      const items = await estimateMeal(aiKey, aiModel, aiText.trim(), (m) => setAiError(m));
      if (items.length === 0) setAiError('A IA não identificou alimentos. Descreva melhor (ex: "150g de arroz, 2 ovos").');
      else setAiError('');
      setAiItems(items);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Falha na estimativa.');
    } finally {
      setAiBusy(false);
    }
  };

  const confirmAiAll = () => {
    aiItems.forEach((i) => addFood({ date: today, name: `${i.name} ✨`, qtyLabel: i.qtyLabel, kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat }));
    setAiItems([]); setAiText('');
  };

  const todaysFoods = foods.filter((f) => f.date === today);
  const tot = todaysFoods.reduce(
    (a, f) => ({ kcal: a.kcal + f.kcal, protein: a.protein + f.protein, carbs: a.carbs + f.carbs, fat: a.fat + f.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const todayWd = ([1, 2, 3, 4, 5, 6, 0] as const)[(new Date().getDay() + 6) % 7];
  const goal = plan?.week.find((d) => d.weekday === todayWd)?.macros ?? { kcal: 2300, protein: 140, carbs: 260, fat: 70 };

  const waterMl = water[today] ?? 0;
  const waterPct = Math.min(100, Math.round((waterMl / waterGoal) * 100));

  return (
    <div>
      <div className="card">
        <h3>🍽️ Consumido hoje vs meta da planilha</h3>
        <div className="sum-grid">
          <div><small>🔥 Calorias</small><strong>{tot.kcal} / {goal.kcal}</strong><Bar value={tot.kcal} goal={goal.kcal} color="var(--tempo)" /></div>
          <div><small>🥩 Proteínas</small><strong>{Math.round(tot.protein)}g / {goal.protein}g</strong><Bar value={tot.protein} goal={goal.protein} color="var(--hard)" /></div>
          <div><small>🍚 Carbos</small><strong>{Math.round(tot.carbs)}g / {goal.carbs}g</strong><Bar value={tot.carbs} goal={goal.carbs} color="var(--easy)" /></div>
          <div><small>🥑 Gorduras</small><strong>{Math.round(tot.fat)}g / {goal.fat}g</strong><Bar value={tot.fat} goal={goal.fat} color="var(--primary)" /></div>
        </div>
      </div>

      <div className="card">
        <h3>✨ Descrever refeição com IA</h3>
        <p className="hint">Escreva livre, ex: "prato com 150g de arroz, 1 concha de feijão, 120g de frango e salada".</p>
        <textarea className="text-input ai-text" value={aiText} onChange={(e) => setAiText(e.target.value)}
          placeholder="Descreva o que você comeu..." />
        <div className="wizard-nav" style={{ marginTop: 8 }}>
          <span className="hint">{aiKey && aiModel ? `IA pronta (${aiModel.replace('gemini-', '')})` : 'IA não configurada'}</span>
          <button className="btn primary" disabled={aiBusy} onClick={runAiEstimate}>
            {aiBusy ? 'Estimando...' : 'Estimar calorias ✨'}
          </button>
        </div>
        {aiError && <p className="error">{aiError}</p>}
        {aiItems.length > 0 && (
          <div className="add-box">
            {aiItems.map((i, idx) => (
              <div key={idx} className="log-row">
                <div><strong>{i.name}</strong><small> · {i.qtyLabel} · {i.kcal} kcal (P{i.protein} C{i.carbs} G{i.fat})</small></div>
              </div>
            ))}
            <div className="wizard-nav">
              <button className="btn ghost" onClick={() => setAiItems([])}>Descartar</button>
              <button className="btn primary" onClick={confirmAiAll}>Adicionar ao diário ✓</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>📋 Hoje ({todaysFoods.length} itens)</h3>
        {todaysFoods.length === 0 && <p className="hint">Nada registrado ainda hoje.</p>}
        {todaysFoods.map((f) => (
          <div key={f.id} className="log-row">
            <div><strong>{f.name}</strong><small> · {f.qtyLabel} · {f.kcal} kcal (P{f.protein} C{f.carbs} G{f.fat})</small></div>
            <button className="btn ghost sm" onClick={() => removeFood(f.id)}>✕</button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>💧 Água de hoje</h3>
        <div className="water-top">
          <strong>{waterMl} ml / {waterGoal} ml ({waterPct}%)</strong>
          <label className="hint">Meta: <input type="number" value={waterGoal} min={500} max={6000} step={100}
            onChange={(e) => setWaterGoal(Number(e.target.value) || 2500)} className="mini-input" /> ml</label>
        </div>
        <div className="meter big"><div className="meter-fill" style={{ width: `${waterPct}%`, background: 'var(--easy)' }} /></div>
        <div className="day-grid" style={{ marginTop: 8 }}>
          <button className="day-btn" onClick={() => addWater(today, 250)}>+ 🥛 250ml</button>
          <button className="day-btn" onClick={() => addWater(today, 500)}>+ 🍶 500ml</button>
          <button className="day-btn" onClick={() => addWater(today, 750)}>+ 💧 750ml</button>
          <button className="day-btn" onClick={() => addWater(today, -250)}>− 250ml</button>
        </div>
      </div>

      <IaSettings />
    </div>
  );
}
