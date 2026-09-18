import { useState } from 'react';
import { PlanProvider, usePlan } from './store/PlanContext';
import OnboardingWizard from './components/OnboardingWizard';
import Dashboard from './components/Dashboard';
import WeekCalendar from './components/WeekCalendar';
import WorkoutDetails from './components/WorkoutDetails';
import FoodDiary from './components/FoodDiary';
import Coach from './components/Coach';
import Duvidas from './components/Duvidas';
import Login from './components/Login';
import { cloudEnabled } from './lib/supabase';
import './index.css';

type Tab = 'plano' | 'comida' | 'coach' | 'duvidas';

function Shell() {
  const { finished, resetUser, session, authReady, offlineOk, signOut, cloudSyncing } = usePlan();
  const [tab, setTab] = useState<Tab>('plano');

  if (cloudEnabled && !authReady) {
    return (
      <div className="app">
        <main className="main"><div className="card"><p>Carregando sua conta...</p></div></main>
      </div>
    );
  }

  if (cloudEnabled && !session && !offlineOk) {
    return (
      <div className="app">
        <header className="topbar">
          <div>
            <h1>🏃 Planilha Integrada</h1>
            <small>Corrida · Musculação · Nutrição — estilo Runna</small>
          </div>
        </header>
        <main className="main"><Login /></main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>🏃 Planilha Integrada</h1>
          <small>Corrida · Musculação · Nutrição — estilo Runna</small>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {session && <span className="badge">☁️ {session.user.email}{cloudSyncing ? ' · sinc...' : ''}</span>}
          {finished && (
            <button className="btn ghost" onClick={resetUser}>↺ Refazer anamnese</button>
          )}
          {session && (
            <button className="btn ghost" onClick={signOut}>Sair</button>
          )}
        </div>
      </header>

      {finished && (
        <nav className="tabs">
          <button className={tab === 'plano' ? 'active' : ''} onClick={() => setTab('plano')}>📅 Planilha</button>
          <button className={tab === 'comida' ? 'active' : ''} onClick={() => setTab('comida')}>🍽️ Alimentação</button>
          <button className={tab === 'coach' ? 'active' : ''} onClick={() => setTab('coach')}>🧑‍🏫 Coach</button>
          <button className={tab === 'duvidas' ? 'active' : ''} onClick={() => setTab('duvidas')}>❓ Dúvidas</button>
        </nav>
      )}

      <main className="main">
        {!finished ? (
          <OnboardingWizard />
        ) : (
          <>
            {tab === 'plano' && (<><Dashboard /><WeekCalendar /></>)}
            {tab === 'comida' && <FoodDiary />}
            {tab === 'coach' && <Coach />}
            {tab === 'duvidas' && <Duvidas />}
          </>
        )}
      </main>
      <WorkoutDetails />
      <footer className="footer">
        <small>Uso pessoal · Paces VDOT (Daniels) · Sem perna pesada na véspera de treino forte · 48h entre Tiros e Long Run</small>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <PlanProvider>
      <Shell />
    </PlanProvider>
  );
}
