import { useState } from 'react';
import { WEEK_DAYS, type RaceDistance, type UserData, type WeekDay } from '../types';
import { usePlan } from '../store/PlanContext';

function DayMultiSelect({
  value, onChange, exclude = [],
}: { value: WeekDay[]; onChange: (d: WeekDay[]) => void; exclude?: WeekDay[] }) {
  const toggle = (d: WeekDay) => {
    if (exclude.includes(d)) return;
    onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]);
  };
  return (
    <div className="day-grid">
      {WEEK_DAYS.map((d) => {
        const disabled = exclude.includes(d.value);
        const active = value.includes(d.value);
        return (
          <button
            key={d.value}
            type="button"
            disabled={disabled}
            onClick={() => toggle(d.value)}
            className={`day-btn${active ? ' active' : ''}${disabled ? ' disabled' : ''}`}
          >
            {d.short}
          </button>
        );
      })}
    </div>
  );
}

const STEPS = [
  'Objetivo',
  'Nível',
  'Corrida',
  'Musculação',
  'Descanso',
  'Nutrição',
  'Revisão',
];

export default function OnboardingWizard() {
  const { user, setUser, step, setStep, setFinished } = usePlan();
  const [error, setError] = useState('');

  const go = (dir: 1 | -1) => {
    setError('');
    if (dir === -1) { setStep(Math.max(0, step - 1)); return; }
    const err = validate(step, user);
    if (err) { setError(err); return; }
    if (step < STEPS.length - 1) setStep(step + 1);
    else setFinished(true);
  };

  return (
    <div className="card wizard">
      <div className="steps-bar">
        {STEPS.map((s, i) => (
          <div key={s} className={`step-dot${i === step ? ' current' : ''}${i < step ? ' done' : ''}`}>
            <span>{i + 1}</span>
            <small>{s}</small>
          </div>
        ))}
      </div>

      <h2>{stepTitle(step)}</h2>
      {error && <p className="error">{error}</p>}

      <div className="wizard-body">
        {step === 0 && <StepGoal user={user} setUser={setUser} />}
        {step === 1 && <StepLevel user={user} setUser={setUser} />}
        {step === 2 && <StepRun user={user} setUser={setUser} />}
        {step === 3 && <StepStrength user={user} setUser={setUser} />}
        {step === 4 && <StepRest user={user} setUser={setUser} />}
        {step === 5 && <StepNutrition user={user} setUser={setUser} />}
        {step === 6 && <StepReview />}
      </div>

      <div className="wizard-nav">
        <button disabled={step === 0} onClick={() => go(-1)} className="btn ghost">Voltar</button>
        <button onClick={() => go(1)} className="btn primary">
          {step === STEPS.length - 1 ? 'Gerar minha planilha →' : 'Continuar →'}
        </button>
      </div>
    </div>
  );
}

function stepTitle(s: number): string {
  return [
    '1 · Qual seu objetivo principal?',
    '2 · Nível e histórico',
    '3 · Disponibilidade para corrida',
    '4 · Disponibilidade para musculação',
    '5 · Dias de descanso obrigatório',
    '6 · Perfil nutricional (opcional)',
    '7 · Revisão e geração do plano',
  ][s];
}

function validate(step: number, u: UserData): string {
  if (step === 0) {
    if (!u.mainGoal) return 'Escolha um objetivo principal.';
    if ((u.mainGoal === 'prova-marcada' || u.mainGoal === 'baixar-tempo') && !u.raceDistance)
      return 'Escolha a distância da prova (5k, 10k, 21k ou 42k).';
    if (u.mainGoal === 'prova-marcada' && !u.raceDate) return 'Informe a data da prova.';
    return '';
  }
  if (step === 1) {
    if (!u.weeklyVolume) return 'Informe seu volume semanal atual.';
    if (!(u.refTimeMin > 0)) return 'Informe um tempo de referência válido.';
    return '';
  }
  if (step === 2) {
    if (u.runDays.length === 0) return 'Selecione ao menos 1 dia para correr.';
    if (u.longRunDay == null) return 'Escolha o dia do treino longo.';
    if (!u.runDays.includes(u.longRunDay)) return 'O Long Run precisa estar entre os dias de corrida.';
    if (u.runDays.some((d) => u.restDays.includes(d))) return 'Há conflito com dias de descanso. Ajuste na próxima etapa ou aqui.';
    return '';
  }
  if (step === 3) {
    const clash = u.strengthDays.filter((d) => u.restDays.includes(d));
    if (clash.length > 0) return 'Musculação não pode cair em dia de descanso total.';
    return '';
  }
  if (step === 4) {
    const clashRun = u.runDays.filter((d) => u.restDays.includes(d));
    if (clashRun.length > 0) return 'Dias de descanso não podem ter corrida agendada. Volte e ajuste os dias de corrida.';
    return '';
  }
  return '';
}

// ── Steps ────────────────────────────────────────────────────────────────

function StepGoal({ user, setUser }: { user: UserData; setUser: (p: Partial<UserData>) => void }) {
  const opts = [
    { v: 'primeiros-5k', label: 'Primeiros 5k', desc: 'Sair do zero com segurança' },
    { v: 'baixar-tempo', label: 'Baixar tempo', desc: '5k · 10k · 21k · 42k' },
    { v: 'condicionamento', label: 'Condicionamento geral', desc: 'Saúde e constância' },
    { v: 'prova-marcada', label: 'Prova com data marcada', desc: 'Plano com data-alvo' },
  ] as const;
  return (
    <div>
      <div className="opt-grid">
        {opts.map((o) => (
          <button key={o.v} className={`opt${user.mainGoal === o.v ? ' active' : ''}`}
            onClick={() => setUser({ mainGoal: o.v })}>
            <strong>{o.label}</strong><small>{o.desc}</small>
          </button>
        ))}
      </div>
      {(user.mainGoal === 'baixar-tempo' || user.mainGoal === 'prova-marcada') && (
        <div className="field-row">
          <label>Distância alvo</label>
          <div className="day-grid">
            {(['5k', '10k', '21k', '42k'] as RaceDistance[]).map((d) => (
              <button key={d} onClick={() => setUser({ raceDistance: d })}
                className={`day-btn${user.raceDistance === d ? ' active' : ''}`}>{d}</button>
            ))}
          </div>
        </div>
      )}
      {user.mainGoal === 'prova-marcada' && (
        <div className="field-row">
          <label>Data da prova</label>
          <input type="date" value={user.raceDate ?? ''} onChange={(e) => setUser({ raceDate: e.target.value || null })} />
        </div>
      )}
    </div>
  );
}

function StepLevel({ user, setUser }: { user: UserData; setUser: (p: Partial<UserData>) => void }) {
  return (
    <div>
      <div className="field-row">
        <label>Prova de referência recente</label>
        <div className="day-grid">
          {(['5k', '10k'] as const).map((d) => (
            <button key={d} onClick={() => setUser({ refDistance: d })}
              className={`day-btn${user.refDistance === d ? ' active' : ''}`}>{d}</button>
          ))}
        </div>
      </div>
      <div className="field-row inline">
        <div>
          <label>Tempo (min)</label>
          <input type="number" min={5} max={180} value={user.refTimeMin}
            onChange={(e) => setUser({ refTimeMin: Number(e.target.value) })} />
        </div>
        <div>
          <label>Segundos</label>
          <input type="number" min={0} max={59} value={user.refTimeSec}
            onChange={(e) => setUser({ refTimeSec: Number(e.target.value) })} />
        </div>
      </div>
      <div className="field-row">
        <label>Volume semanal atual de corrida</label>
        <div className="opt-grid">
          {([
            ['0-10', '0–10 km', 'Iniciante'],
            ['10-25', '10–25 km', 'Base leve'],
            ['25-40', '25–40 km', 'Intermediário'],
            ['40+', '40 km+', 'Avançado'],
          ] as const).map(([v, l, d]) => (
            <button key={v} onClick={() => setUser({ weeklyVolume: v })}
              className={`opt${user.weeklyVolume === v ? ' active' : ''}`}>
              <strong>{l}</strong><small>{d}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepRun({ user, setUser }: { user: UserData; setUser: (p: Partial<UserData>) => void }) {
  return (
    <div>
      <div className="field-row">
        <label>Quais dias você pode correr?</label>
        <DayMultiSelect value={user.runDays} exclude={user.restDays}
          onChange={(runDays) => {
            const keepLong = user.longRunDay != null && runDays.includes(user.longRunDay);
            setUser({ runDays, longRunDay: keepLong ? user.longRunDay : null });
          }} />
      </div>
      <div className="field-row">
        <label>Dia preferido para o Long Run (escolha 1)</label>
        <div className="day-grid">
          {WEEK_DAYS.map((d) => {
            const avail = user.runDays.includes(d.value);
            return (
              <button key={d.value} disabled={!avail}
                onClick={() => setUser({ longRunDay: d.value })}
                className={`day-btn${user.longRunDay === d.value ? ' active' : ''}${!avail ? ' disabled' : ''}`}>
                {d.short}
              </button>
            );
          })}
        </div>
        {!user.runDays.length && <small className="hint">Selecione primeiro os dias de corrida acima.</small>}
      </div>
    </div>
  );
}

function StepStrength({ user, setUser }: { user: UserData; setUser: (p: Partial<UserData>) => void }) {
  return (
    <div>
      <div className="field-row">
        <label>Dias para musculação</label>
        <DayMultiSelect value={user.strengthDays} exclude={user.restDays}
          onChange={(strengthDays) => setUser({ strengthDays })} />
      </div>
      <div className="field-row">
        <label className="check">
          <input type="checkbox" checked={user.allowSameDayRunLift}
            onChange={(e) => setUser({ allowSameDayRunLift: e.target.checked })} />
          Permitir corrida e musculação no mesmo dia
        </label>
        {!user.allowSameDayRunLift && (
          <small className="hint">Vamos tentar separar em dias alternados quando houver dias livres.</small>
        )}
      </div>
    </div>
  );
}

function StepRest({ user, setUser }: { user: UserData; setUser: (p: Partial<UserData>) => void }) {
  return (
    <div>
      <div className="field-row">
        <label>Dias de descanso total (nenhuma atividade)</label>
        <DayMultiSelect value={user.restDays}
          onChange={(restDays) => setUser({ restDays })} />
      </div>
      <small className="hint">Descanso bloqueia qualquer treino no dia — inclusive longão e força.</small>
    </div>
  );
}

function StepNutrition({ user, setUser }: { user: UserData; setUser: (p: Partial<UserData>) => void }) {
  return (
    <div>
      <div className="field-row">
        <label>Objetivo corporal</label>
        <div className="opt-grid">
          {([
            ['manter', 'Manter peso', 'Equilíbrio'],
            ['hipertrofia', 'Ganho de massa', 'Superávit leve'],
            ['cutting', 'Perda de gordura', 'Déficit calórico'],
          ] as const).map(([v, l, d]) => (
            <button key={v} onClick={() => setUser({ bodyGoal: v })}
              className={`opt${user.bodyGoal === v ? ' active' : ''}`}>
              <strong>{l}</strong><small>{d}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="field-row">
        <label>Preferência alimentar</label>
        <div className="opt-grid">
          {([
            ['onivoro', 'Onívoro', 'Tudo'],
            ['vegetariano', 'Vegetariano', 'Sem carnes'],
            ['vegano', 'Vegano', '100% vegetal'],
            ['lowcarb', 'Low Carb', 'Pouco carbo'],
          ] as const).map(([v, l, d]) => (
            <button key={v} onClick={() => setUser({ dietPref: v })}
              className={`opt${user.dietPref === v ? ' active' : ''}`}>
              <strong>{l}</strong><small>{d}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepReview() {
  const { user } = usePlan();
  const dayName = (d: WeekDay) => WEEK_DAYS.find((w) => w.value === d)?.short ?? d;
  return (
    <div className="review">
      <ul>
        <li><strong>Objetivo:</strong> {user.mainGoal ?? '—'} {user.raceDistance ? `· ${user.raceDistance}` : ''} {user.raceDate ? `· ${user.raceDate}` : ''}</li>
        <li><strong>Referência:</strong> {user.refDistance} em {user.refTimeMin}:{String(user.refTimeSec).padStart(2, '0')} · {user.weeklyVolume ?? '—'} km/sem</li>
        <li><strong>Corrida:</strong> {user.runDays.map(dayName).join(', ') || '—'} · Longo: {user.longRunDay != null ? dayName(user.longRunDay) : '—'}</li>
        <li><strong>Musculação:</strong> {user.strengthDays.map(dayName).join(', ') || '—'} {user.allowSameDayRunLift ? '(pode coincidir)' : '(separar quando possível)'}</li>
        <li><strong>Descanso:</strong> {user.restDays.map(dayName).join(', ') || '—'}</li>
        <li><strong>Nutrição:</strong> {user.bodyGoal ?? '—'} · {user.dietPref ?? '—'}</li>
      </ul>
      <p className="hint">Ao gerar, os paces VDOT serão calculados do seu tempo de referência e os treinos alocados com 48h entre Tiros e Long Run, sem perna pesada na véspera de treino forte.</p>
    </div>
  );
}
