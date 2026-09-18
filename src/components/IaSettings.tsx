import { useState } from 'react';
import { listModels, pickFlash } from '../lib/gemini';
import { usePlan } from '../store/PlanContext';

/** Configuração da chave gratuita do Gemini (fica só no navegador). */
export default function IaSettings() {
  const { aiKey, setAiKey, aiModel, setAiModel } = usePlan();
  const [draft, setDraft] = useState(aiKey);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    const key = draft.trim();
    if (!key) { setStatus('Cole sua chave primeiro.'); return; }
    setBusy(true); setStatus('Conectando...');
    try {
      const list = await listModels(key);
      if (list.length === 0) throw new Error('Nenhum modelo disponível para esta chave.');
      setAiKey(key);
      // Conectar sempre escolhe o melhor modelo estável e gratuito
      const best = pickFlash(list);
      setAiModel(best);
      setStatus(`✅ Conectado! Modelo: ${best} (${list.length} disponíveis).`);
    } catch (e) {
      setStatus(`❌ ${e instanceof Error ? e.message : 'Falha na conexão.'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h3>✨ IA do app (Gemini — gratuito)</h3>
      <p className="hint">
        Com a chave, o app estima calorias de texto livre e gera a análise do coach.
        Sem chave, o banco local de alimentos e as regras do coach continuam funcionando.
        A chave fica salva <strong>só no seu navegador</strong>. Pegue grátis em{' '}
        <strong>aistudio.google.com → Get API key</strong>.
      </p>
      <div className="field-row">
        <label>Chave da API (AI Studio)</label>
        <input
          className="text-input"
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Cole aqui sua chave do AI Studio"
        />
      </div>
      <div className="wizard-nav">
        <button className="btn ghost" onClick={() => { setDraft(''); setAiKey(''); setStatus('Chave removida.'); }}>
          Remover
        </button>
        <button className="btn primary" disabled={busy} onClick={connect}>
          {busy ? 'Conectando...' : 'Salvar e conectar →'}
        </button>
      </div>
      {status && <p className="hint">{status}</p>}
      {aiKey !== '' && aiModel !== '' && (
        <p className="hint">Modelo em uso agora: <strong>{aiModel}</strong></p>
      )}
    </div>
  );
}
