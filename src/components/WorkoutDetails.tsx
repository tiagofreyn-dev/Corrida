import { WEEK_DAYS } from '../types';
import { usePlan } from '../store/PlanContext';

export default function WorkoutDetails() {
  const { selectedDay, setSelectedDay } = usePlan();
  if (!selectedDay) return null;
  const d = selectedDay;
  const wd = WEEK_DAYS.find((w) => w.value === d.weekday)?.full;

  return (
    <div className="modal-backdrop" onClick={() => setSelectedDay(null)}>
      <div className="card modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="badge">{wd}</span>
            <h2>{d.title}</h2>
            <p>{d.description}</p>
          </div>
          <button className="btn ghost" onClick={() => setSelectedDay(null)}>✕</button>
        </div>

        {d.blocks.length > 0 ? (
          <table className="detail-table">
            <thead>
              <tr><th>Bloco</th><th>Distância</th><th>Tempo est.</th><th>Ritmo-alvo</th></tr>
            </thead>
            <tbody>
              {d.blocks.map((b, i) => (
                <tr key={i}>
                  <td>{b.label}</td>
                  <td>{b.distanceKm} km</td>
                  <td>~{b.durationMin} min</td>
                  <td><strong>{b.targetPace}</strong></td>
                </tr>
              ))}
              <tr className="total">
                <td>Total</td>
                <td>{d.distanceKm} km</td>
                <td>~{d.blocks.reduce((a, b) => a + b.durationMin, 0)} min</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="hint">Sem blocos de corrida neste dia.</p>
        )}

        {d.strength && (
          <div>
            <h3>🏋️ Fortalecimento / Core {d.strengthFocus ? `· ${d.strengthFocus}` : ''}</h3>
            <table className="detail-table">
              <thead><tr><th>Exercício</th><th>Séries</th><th>Reps</th></tr></thead>
              <tbody>
                {d.strength.map((ex, i) => (
                  <tr key={i}><td>{ex.name}</td><td>{ex.sets}</td><td>{ex.reps}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="macros">
          <strong>Meta do dia:</strong>
          <span>🔥 {d.macros.kcal} kcal</span>
          <span>🥩 {d.macros.protein}g</span>
          <span>🍚 {d.macros.carbs}g</span>
          <span>🥑 {d.macros.fat}g</span>
        </div>
      </div>
    </div>
  );
}
