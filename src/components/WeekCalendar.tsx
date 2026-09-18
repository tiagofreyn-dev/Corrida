import { WEEK_DAYS } from '../types';
import { usePlan } from '../store/PlanContext';
import { kindColor, kindLabel } from './Dashboard';

export default function WeekCalendar() {
  const { plan, setSelectedDay, selectedDay } = usePlan();
  if (!plan) return null;

  return (
    <div className="card">
      <h3>Calendário semanal</h3>
      <div className="legend">
        <span><i className="dot" style={{ background: 'var(--easy)' }} /> Leve</span>
        <span><i className="dot" style={{ background: 'var(--hard)' }} /> Tiros</span>
        <span><i className="dot" style={{ background: 'var(--tempo)' }} /> Tempo</span>
        <span><i className="dot" style={{ background: 'var(--long)' }} /> Longo</span>
        <span><i className="dot" style={{ background: 'var(--lift)' }} /> Musculação</span>
        <span><i className="dot" style={{ background: 'var(--rest)' }} /> Descanso</span>
      </div>
      <div className="week-grid">
        {plan.week.map((d) => {
          const wd = WEEK_DAYS.find((w) => w.value === d.weekday)!;
          const hasStrength = !!d.strength && d.strengthFocus !== 'core';
          const color = kindColor(d.kind, hasStrength || (!!d.strength && d.distanceKm === 0));
          const sel = selectedDay?.weekday === d.weekday;
          return (
            <button key={d.weekday} onClick={() => setSelectedDay(d)}
              className={`day-card${sel ? ' sel' : ''}`} style={{ borderTop: `5px solid ${color}` }}>
              <strong>{wd.short}</strong>
              <small>{kindLabel(d)}</small>
              {d.distanceKm > 0 && <small>{d.distanceKm} km</small>}
              {d.strength && <small>🏋️ {d.strengthFocus}</small>}
              <small>🍚 {d.macros.carbs}g · 🔥 {d.macros.kcal}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
