import { WEEK_DAYS, type DayPlan } from '../types';
import { usePlan } from '../store/PlanContext';

export function kindColor(kind: DayPlan['kind'], hasStrength: boolean): string {
  if (kind === 'rest' && !hasStrength) return 'var(--rest)';
  if (kind === 'interval') return 'var(--hard)';
  if (kind === 'tempo') return 'var(--tempo)';
  if (kind === 'long') return 'var(--long)';
  if (hasStrength) return 'var(--lift)';
  return 'var(--easy)';
}

export function kindLabel(d: DayPlan): string {
  if (d.kind === 'rest' && !d.strength) return 'Descanso';
  if (d.kind === 'interval') return 'Tiros';
  if (d.kind === 'tempo') return 'Tempo Run';
  if (d.kind === 'long') return 'Long Run';
  if (d.distanceKm > 0 && d.strength && d.strengthFocus !== 'core') return 'Corrida + Força';
  if (d.distanceKm > 0) return 'Corrida leve';
  if (d.strength) return 'Musculação';
  return 'Livre';
}

export default function Dashboard() {
  const { plan, setSelectedDay } = usePlan();
  if (!plan) return null;

  const todayIdx = (new Date().getDay() + 6) % 7; // Seg=0
  const order: number[] = [1, 2, 3, 4, 5, 6, 0];
  const todayWd = order[todayIdx] as DayPlan['weekday'];
  const todays = plan.week.find((d) => d.weekday === todayWd) ?? plan.week[0];

  return (
    <div>
      {plan.warnings.length > 0 && (
        <div className="card warnings">
          {plan.warnings.map((w, i) => <p key={i}>⚠️ {w}</p>)}
        </div>
      )}

      <div className="card today" style={{ borderLeft: `6px solid ${kindColor(todays.kind, !!todays.strength)}` }}>
        <div className="today-head">
          <span className="badge">Treino do dia · {WEEK_DAYS.find((w) => w.value === todays.weekday)?.full}</span>
          <h2>{todays.title}</h2>
          <p>{todays.description}</p>
        </div>
        {todays.blocks.length > 0 && (
          <div className="blocks">
            {todays.blocks.map((b, i) => (
              <div key={i} className="block">
                <strong>{b.label}</strong>
                <span>{b.distanceKm} km · ~{b.durationMin} min</span>
                <span className="pace">{b.targetPace}</span>
              </div>
            ))}
          </div>
        )}
        <div className="macros">
          <span>🔥 {todays.macros.kcal} kcal</span>
          <span>🥩 {todays.macros.protein}g prot</span>
          <span>🍚 {todays.macros.carbs}g carbo</span>
          <span>🥑 {todays.macros.fat}g gord</span>
        </div>
        <button className="btn primary" onClick={() => setSelectedDay(todays)}>Ver detalhes →</button>
      </div>

      <div className="card paces">
        <h3>Ritmos VDOT ({plan.paces.vdot})</h3>
        <div className="pace-grid">
          <div><small>Easy / Regenerativo</small><strong>{plan.paces.easy}</strong></div>
          <div><small>Longo</small><strong>{plan.paces.long}</strong></div>
          <div><small>Tempo / Limiar</small><strong>{plan.paces.tempo}</strong></div>
          <div><small>Tiros / VO2max</small><strong>{plan.paces.interval}</strong></div>
        </div>
      </div>
    </div>
  );
}
