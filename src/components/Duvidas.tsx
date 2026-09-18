import { useState } from 'react';
import { generateText } from '../lib/gemini';
import { usePlan } from '../store/PlanContext';
import DataTransfer from './DataTransfer';

/** Aba de dúvidas sobre o app, treino e nutrição — responde com seus dados reais. */
export default function Duvidas() {
  const { user, plan, workouts, aiKey, aiModel, chatMsgs: msgs, addChatMsg, clearChat } = usePlan();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    if (!aiKey || !aiModel) {
      setStatus('Configure sua chave do Gemini na aba Alimentação (cartão "IA do app").');
      return;
    }
    const context = `Dados do atleta e do app:
- Objetivo: ${user.mainGoal ?? '?'} ${user.raceDistance ?? ''} ${user.raceDate ?? ''}
- Referência: ${user.refDistance ?? '?'} em ${user.refTimeMin}:${String(user.refTimeSec).padStart(2, '0')} · volume ${user.weeklyVolume ?? '?'}
- Objetivo corporal: ${user.bodyGoal ?? '?'} · dieta: ${user.dietPref ?? '?'}
- Paces: ${plan ? `easy ${plan.paces.easy}, longo ${plan.paces.long}, tempo ${plan.paces.tempo}, tiros ${plan.paces.interval}` : '?'}
- Semana: ${plan ? plan.week.map((w) => `dia ${w.weekday}: ${w.title}${w.distanceKm > 0 ? ` ${w.distanceKm}km` : ''}`).join(' | ') : '?'}
- Check-ins recentes: ${workouts.length === 0 ? 'nenhum' : workouts.slice(0, 5).map((w) => `${w.date} ${w.done ? 'fez' : 'faltou'} ${w.title} RPE${w.rpe}`).join(' | ')}`;
    const system = `Você é o assistente do app de planilha de corrida do usuário. Responda em português, direto e prático, em no máximo 120 palavras, usando os dados reais do app quando relevante. Se perguntarem o significado de algo do app (paces, RPE, blocos, macros), explique com exemplos usando os números do atleta.
${context}`;
    const next = [...msgs, { role: 'user' as const, text: q }];
    addChatMsg('user', q);
    setInput('');
    setBusy(true);
    setStatus('');
    try {
      const history = next.slice(-8).map((m) => ({ role: m.role, text: m.text }));
      const answer = await generateText(aiKey, aiModel, system, history.slice(0, -1), q, (m) => setStatus(m));
      setStatus('');
      addChatMsg('model', answer.trim());
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Falha na resposta.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <div className="card">
      <h3>❓ Dúvidas sobre o app</h3>
      <p className="hint">Pergunte qualquer coisa — ex: "o que significa 6:00–6:25/km?", "por que meu longão caiu no domingo?", "estou comendo proteína suficiente?". A IA responde com os seus dados.</p>
      <div className="chat">
        {msgs.length === 0 && <p className="hint">Nenhuma pergunta ainda. Manda a primeira abaixo 👇</p>}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'msg-user' : 'msg-ai'}>{m.text}</div>
        ))}
        {busy && <div className="msg-ai thinking">Pensando...</div>}
      </div>
      {status && <p className="error">{status}</p>}
      <div className="chat-input">
        <input
          className="text-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder="Ex: o que é RPE?"
        />
        <button className="btn primary" disabled={busy} onClick={send}>
          {busy ? '...' : 'Enviar →'}
        </button>
      </div>
      {msgs.length > 0 && (
        <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={clearChat}>
          Limpar conversa
        </button>
      )}
    </div>
    <DataTransfer />
    </>
  );
}
