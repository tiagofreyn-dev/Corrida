import { useState } from 'react';
import { usePlan } from '../store/PlanContext';
import { cloudEnabled } from '../lib/supabase';

/** Tela de conta: entrar ou criar conta (e-mail + senha). */
export default function Login() {
  const { signIn, signUp, authError, setOfflineOk } = usePlan();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    const ok = mode === 'in' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (!ok) return;
  };

  return (
    <div className="card wizard">
      <div className="today-head">
        <span className="badge">☁️ Conta na nuvem</span>
        <h2>{mode === 'in' ? 'Entrar' : 'Criar conta'}</h2>
        <p>Uma conta para PC e celular: seus treinos, comidas e check-ins sincronizam sozinhos.</p>
      </div>
      {!cloudEnabled && (
        <p className="error">Supabase não configurado (falta o .env.local). Rode em modo offline por enquanto.</p>
      )}
      <div className="field-row">
        <label>E-mail</label>
        <input className="text-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
      </div>
      <div className="field-row">
        <label>Senha (mín. 6 caracteres)</label>
        <input className="text-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') go(); }} placeholder="••••••" />
      </div>
      {authError && <p className="error">{authError}</p>}
      <div className="wizard-nav">
        <button className="btn ghost" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Criar conta' : 'Já tenho conta'}
        </button>
        <button className="btn primary" disabled={busy || !cloudEnabled} onClick={go}>
          {busy ? 'Aguarde...' : mode === 'in' ? 'Entrar →' : 'Criar e entrar →'}
        </button>
      </div>
      <p className="hint" style={{ marginTop: 12 }}>
        <button className="btn ghost sm" onClick={setOfflineOk}>Continuar sem conta (só neste aparelho)</button>
      </p>
    </div>
  );
}
