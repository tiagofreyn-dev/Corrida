import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { DayPlan, GeneratedPlan, UserData } from '../types';
import { initialUserData } from '../types';
import { generateCustomPlan } from '../lib/generatePlan';
import { supabase, cloudEnabled } from '../lib/supabase';

// ── Logs: alimentação, água e treinos ─────────────────────────────────────

export interface FoodEntry {
  id: string;
  date: string; // yyyy-mm-dd
  name: string;
  qtyLabel: string; // "150g" | "2 un"
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WorkoutEntry {
  id: string;
  date: string; // yyyy-mm-dd
  title: string;
  done: boolean;
  distanceKm: number;
  timeMin: number;
  rpe: number; // 0-10 sensação de esforço
  notes: string;
}

export interface ChatMsg {
  role: 'user' | 'model';
  text: string;
}

interface PlanState {
  user: UserData;
  setUser: (patch: Partial<UserData>) => void;
  resetUser: () => void;
  plan: GeneratedPlan | null;
  regenerate: () => void;
  selectedDay: DayPlan | null;
  setSelectedDay: (d: DayPlan | null) => void;
  step: number;
  setStep: (n: number) => void;
  finished: boolean;
  setFinished: (b: boolean) => void;
  // Diário alimentar
  foods: FoodEntry[];
  addFood: (e: Omit<FoodEntry, 'id'>) => void;
  removeFood: (id: string) => void;
  // Água (ml por dia)
  water: Record<string, number>;
  addWater: (date: string, ml: number) => void;
  setWaterGoal: (ml: number) => void;
  waterGoal: number;
  // Treinos / coach
  workouts: WorkoutEntry[];
  addWorkout: (e: Omit<WorkoutEntry, 'id'>) => void;
  removeWorkout: (id: string) => void;
  // IA (Gemini)
  aiKey: string;
  setAiKey: (k: string) => void;
  aiModel: string;
  setAiModel: (m: string) => void;
  // Chat dúvidas
  chatMsgs: ChatMsg[];
  addChatMsg: (role: 'user' | 'model', text: string) => void;
  clearChat: () => void;
  // Conta / nuvem
  session: Session | null;
  authReady: boolean;
  authError: string;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  offlineOk: boolean;
  setOfflineOk: () => void;
  cloudSyncing: boolean;
}

const Ctx = createContext<PlanState | null>(null);

export const LS_KEY = 'runna-like-user-v1';
const LS_FOODS = 'runna-like-foods-v1';
const LS_WATER = 'runna-like-water-v1';
const LS_WORKOUTS = 'runna-like-workouts-v1';
const LS_WATER_GOAL = 'runna-like-watergoal-v1';
const LS_AI_KEY = 'runna-like-aikey-v1';
const LS_AI_MODEL = 'runna-like-aimodel-v1';
const LS_FINISHED = 'runna-like-finished-v1';
const LS_STEP = 'runna-like-step-v1';
const LS_CHAT = 'runna-like-duvidas-v1';
const LS_TS = 'runna-like-state-ts';
const LS_OFFLINE = 'runna-like-offline';

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...Array.isArray(fallback) ? [] : fallback, ...JSON.parse(raw) } as T;
  } catch { /* ignore */ }
  return fallback;
}

function loadInitial(): UserData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...initialUserData, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return initialUserData;
}

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch { /* ignore */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Garante id em formato UUID (linhas antigas locais ganham id novo ao subir). */
function ensureUuid(id: string): string {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : newId();
}

function loadFoods(): FoodEntry[] {
  try {
    const raw = localStorage.getItem(LS_FOODS);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function loadWorkouts(): WorkoutEntry[] {
  try {
    const raw = localStorage.getItem(LS_WORKOUTS);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function loadChat(): ChatMsg[] {
  try {
    const raw = localStorage.getItem(LS_CHAT);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.slice(-30);
    }
  } catch { /* ignore */ }
  return [];
}

function touchTs() {
  try { localStorage.setItem(LS_TS, String(Date.now())); } catch { /* ignore */ }
}

function getTs(): number {
  try { return Number(localStorage.getItem(LS_TS)) || 0; } catch { return 0; }
}

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<UserData>(loadInitial);
  const [selectedDay, setSelectedDay] = useState<DayPlan | null>(null);
  const [step, setStepState] = useState<number>(() => {
    try { return Number(localStorage.getItem(LS_STEP)) || 0; } catch { return 0; }
  });
  const [finished, setFinishedState] = useState<boolean>(() => {
    try {
      if (localStorage.getItem(LS_FINISHED) === '1') return true;
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.mainGoal && u?.runDays?.length > 0 && u?.longRunDay != null && u?.weeklyVolume) {
          localStorage.setItem(LS_FINISHED, '1');
          return true;
        }
      }
    } catch { /* ignore */ }
    return false;
  });
  const [foods, setFoods] = useState<FoodEntry[]>(loadFoods);
  const [water, setWater] = useState<Record<string, number>>(() => loadJSON(LS_WATER, {}));
  const [waterGoal, setWaterGoalState] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(LS_WATER_GOAL);
      if (raw) return Number(raw) || 2500;
    } catch { /* ignore */ }
    return 2500;
  });
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>(loadWorkouts);
  const [aiKey, setAiKeyState] = useState<string>(() => {
    try { return localStorage.getItem(LS_AI_KEY) ?? ''; } catch { return ''; }
  });
  const [aiModel, setAiModelState] = useState<string>(() => {
    try {
      const m = localStorage.getItem(LS_AI_MODEL) ?? '';
      if (/prev|preview|omni|2\.5-flash$|2\.0|3\.[678]/i.test(m)) {
        localStorage.removeItem(LS_AI_MODEL);
        return '';
      }
      return m;
    } catch { return ''; }
  });
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>(loadChat);
  // Auth
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!cloudEnabled);
  const [authError, setAuthError] = useState('');
  const [offlineOk, setOfflineOkState] = useState(() => {
    try { return localStorage.getItem(LS_OFFLINE) === '1'; } catch { return false; }
  });
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const syncedFor = useRef<string | null>(null);

  // ── Auth: observa sessão ──
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s);
      setAuthReady(true);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    if (!supabase) return false;
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setAuthError(traduzAuth(error.message)); return false; }
    return true;
  };

  const signUp = async (email: string, password: string): Promise<boolean> => {
    if (!supabase) return false;
    setAuthError('');
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) { setAuthError(traduzAuth(error.message)); return false; }
    return true;
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    syncedFor.current = null;
    try { localStorage.removeItem(LS_OFFLINE); } catch { /* ignore */ }
    setOfflineOkState(false);
  };

  const setOfflineOk = () => {
    setOfflineOkState(true);
    try { localStorage.setItem(LS_OFFLINE, '1'); } catch { /* ignore */ }
  };

  // ── Sync: baixa + mescla ao logar ──
  useEffect(() => {
    if (!supabase || !session || syncedFor.current === session.user.id) return;
    syncedFor.current = session.user.id;
    (async () => {
      setCloudSyncing(true);
      try {
        const uid = session.user.id;
        const [st, fd, wt, wo, ch] = await Promise.all([
          supabase.from('corrida_state').select('*').eq('user_id', uid).maybeSingle(),
          supabase.from('corrida_foods').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(500),
          supabase.from('corrida_water').select('*').eq('user_id', uid),
          supabase.from('corrida_workouts').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(300),
          supabase.from('corrida_chat').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(30),
        ]);
        const cloud = st.data as {
          user_data: UserData; finished: boolean; step: number; water_goal: number;
          ai_key: string; ai_model: string; updated_at: string;
        } | null;

        if (!cloud) {
          // Primeira vez: sobe tudo que já existe local
          await pushAll(uid);
        } else {
          const cloudTs = new Date(cloud.updated_at).getTime();
          if (getTs() > cloudTs) {
            await pushAll(uid);
          } else {
            applyFromCloud(cloud, fd.data ?? [], wt.data ?? [], wo.data ?? [], ch.data ?? []);
          }
        }
        // Mescla union dos logs (vale pros dois lados)
        await mergeLogs(uid);
      } catch {
        // offline na hora: segue com dados locais
      } finally {
        setCloudSyncing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function applyFromCloud(
    cloud: { user_data: UserData; finished: boolean; step: number; water_goal: number; ai_key: string; ai_model: string },
    fd: Array<Record<string, unknown>>,
    wt: Array<Record<string, unknown>>,
    wo: Array<Record<string, unknown>>,
    ch: Array<Record<string, unknown>>,
  ) {
    try {
      const u = { ...initialUserData, ...(cloud.user_data ?? {}) };
      setUserState(u);
      localStorage.setItem(LS_KEY, JSON.stringify(u));
      setFinishedState(cloud.finished);
      if (cloud.finished) localStorage.setItem(LS_FINISHED, '1');
      setStepState(cloud.step || 0);
      localStorage.setItem(LS_STEP, String(cloud.step || 0));
      setWaterGoalState(cloud.water_goal || 2500);
      localStorage.setItem(LS_WATER_GOAL, String(cloud.water_goal || 2500));
      if (cloud.ai_key) { setAiKeyState(cloud.ai_key); localStorage.setItem(LS_AI_KEY, cloud.ai_key); }
      if (cloud.ai_model) { setAiModelState(cloud.ai_model); localStorage.setItem(LS_AI_MODEL, cloud.ai_model); }
      const nf: FoodEntry[] = fd.map((r) => ({
        id: String(r.id), date: String(r.date), name: String(r.name), qtyLabel: String(r.qty_label ?? ''),
        kcal: Number(r.kcal) || 0, protein: Number(r.protein) || 0, carbs: Number(r.carbs) || 0, fat: Number(r.fat) || 0,
      }));
      setFoods(nf); localStorage.setItem(LS_FOODS, JSON.stringify(nf));
      const nw: Record<string, number> = {};
      wt.forEach((r) => { nw[String(r.date)] = Number(r.ml) || 0; });
      setWater(nw); localStorage.setItem(LS_WATER, JSON.stringify(nw));
      const nwo: WorkoutEntry[] = wo.map((r) => ({
        id: String(r.id), date: String(r.date), title: String(r.title ?? ''), done: Boolean(r.done),
        distanceKm: Number(r.distance_km) || 0, timeMin: Number(r.time_min) || 0,
        rpe: Number(r.rpe) || 0, notes: String(r.notes ?? ''),
      }));
      setWorkouts(nwo); localStorage.setItem(LS_WORKOUTS, JSON.stringify(nwo));
      const nch: ChatMsg[] = (ch as Array<{ role: string; text: string }>).reverse().map((r) => ({
        role: r.role === 'model' ? 'model' : 'user', text: String(r.text ?? ''),
      }));
      setChatMsgs(nch); localStorage.setItem(LS_CHAT, JSON.stringify(nch.slice(-30)));
      touchTs();
    } catch { /* ignore */ }
  }

  async function pushAll(uid: string) {
    if (!supabase) return;
    try {
      const s = snapshot();
      await supabase.from('corrida_state').upsert({
        user_id: uid, user_data: s.user, finished: s.finished, step: s.step,
        water_goal: s.waterGoal, ai_key: s.aiKey, ai_model: s.aiModel, updated_at: new Date().toISOString(),
      });
      if (s.foods.length > 0) {
        await supabase.from('corrida_foods').upsert(s.foods.map((f) => ({
          id: ensureUuid(f.id), user_id: uid, date: f.date, name: f.name, qty_label: f.qtyLabel,
          kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat,
        })));
      }
      const wEntries = Object.entries(s.water);
      if (wEntries.length > 0) {
        await supabase.from('corrida_water').upsert(wEntries.map(([date, ml]) => ({ user_id: uid, date, ml })));
      }
      if (s.workouts.length > 0) {
        await supabase.from('corrida_workouts').upsert(s.workouts.map((w) => ({
          id: ensureUuid(w.id), user_id: uid, date: w.date, title: w.title, done: w.done,
          distance_km: w.distanceKm, time_min: w.timeMin, rpe: w.rpe, notes: w.notes,
        })));
      }
      // Reconcilia ids locais que mudaram
      touchTs();
    } catch { /* ignore */ }
  }

  async function mergeLogs(uid: string) {
    if (!supabase) return;
    try {
      // Sobe linhas locais que a nuvem ainda não tem
      const s = snapshot();
      const [cfd, cwo] = await Promise.all([
        supabase.from('corrida_foods').select('id').eq('user_id', uid),
        supabase.from('corrida_workouts').select('id').eq('user_id', uid),
      ]);
      const haveF = new Set((cfd.data ?? []).map((r: { id: string }) => r.id));
      const missF = s.foods.filter((f) => !haveF.has(f.id));
      if (missF.length > 0) {
        await supabase.from('corrida_foods').insert(missF.map((f) => ({
          id: ensureUuid(f.id), user_id: uid, date: f.date, name: f.name, qty_label: f.qtyLabel,
          kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat,
        })));
      }
      const haveW = new Set((cwo.data ?? []).map((r: { id: string }) => r.id));
      const missW = s.workouts.filter((w) => !haveW.has(w.id));
      if (missW.length > 0) {
        await supabase.from('corrida_workouts').insert(missW.map((w) => ({
          id: ensureUuid(w.id), user_id: uid, date: w.date, title: w.title, done: w.done,
          distance_km: w.distanceKm, time_min: w.timeMin, rpe: w.rpe, notes: w.notes,
        })));
      }
    } catch { /* ignore */ }
  }

  function snapshot() {
    let s: {
      user: UserData; finished: boolean; step: number; waterGoal: number;
      aiKey: string; aiModel: string; foods: FoodEntry[]; water: Record<string, number>; workouts: WorkoutEntry[];
    } | null = null;
    // lê do estado via refs indiretas: usa localStorage (espelho fiel)
    try {
      s = {
        user: loadInitial(),
        finished: localStorage.getItem(LS_FINISHED) === '1',
        step: Number(localStorage.getItem(LS_STEP)) || 0,
        waterGoal: Number(localStorage.getItem(LS_WATER_GOAL)) || 2500,
        aiKey: localStorage.getItem(LS_AI_KEY) ?? '',
        aiModel: localStorage.getItem(LS_AI_MODEL) ?? '',
        foods: loadFoods(),
        water: loadJSON<Record<string, number>>(LS_WATER, {}),
        workouts: loadWorkouts(),
      };
    } catch { /* ignore */ }
    return s ?? {
      user: initialUserData, finished: false, step: 0, waterGoal: 2500,
      aiKey: '', aiModel: '', foods: [], water: {}, workouts: [],
    };
  }

  // ── corrida_state na nuvem (debounce) ──
  const stateJson = useMemo(
    () => JSON.stringify({ user, finished, step, waterGoal, aiKey, aiModel }),
    [user, finished, step, waterGoal, aiKey, aiModel],
  );
  useEffect(() => {
    const db = supabase;
    if (!db || !session) return;
    const t = setTimeout(async () => {
      try {
        const s = snapshot();
        await db.from('corrida_state').upsert({
          user_id: session.user.id, user_data: s.user, finished: s.finished, step: s.step,
          water_goal: s.waterGoal, ai_key: s.aiKey, ai_model: s.aiModel, updated_at: new Date().toISOString(),
        });
      } catch { /* ignore */ }
    }, 1200);
    return () => clearTimeout(t);
  }, [stateJson, session]);

  const setUser = (patch: Partial<UserData>) => {
    setUserState((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    touchTs();
  };

  const resetUser = () => {
    setUserState(initialUserData);
    setFinished(false);
    setStep(0);
    setSelectedDay(null);
    try {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_FINISHED);
      localStorage.removeItem(LS_STEP);
    } catch { /* ignore */ }
    touchTs();
  };

  const plan = useMemo(() => {
    if (!finished) return null;
    try {
      return generateCustomPlan(user);
    } catch {
      return null;
    }
  }, [user, finished]);

  const regenerate = () => setFinished(true);

  const setStep = (n: number) => {
    setStepState(n);
    try { localStorage.setItem(LS_STEP, String(n)); } catch { /* ignore */ }
    touchTs();
  };

  const setFinished = (b: boolean) => {
    setFinishedState(b);
    try {
      if (b) localStorage.setItem(LS_FINISHED, '1');
      else localStorage.removeItem(LS_FINISHED);
    } catch { /* ignore */ }
    touchTs();
  };

  const cloudInsert = async (table: string, row: Record<string, unknown>) => {
    if (!supabase || !session) return;
    try { await supabase.from(table).insert({ ...row, user_id: session.user.id }); } catch { /* ignore */ }
  };

  const cloudDelete = async (table: string, id: string) => {
    if (!supabase || !session) return;
    try { await supabase.from(table).delete().eq('id', id).eq('user_id', session.user.id); } catch { /* ignore */ }
  };

  const addFood = (e: Omit<FoodEntry, 'id'>) => {
    const entry = { ...e, id: newId() };
    setFoods((prev) => {
      const next = [...prev, entry];
      try { localStorage.setItem(LS_FOODS, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    touchTs();
    void cloudInsert('corrida_foods', {
      id: ensureUuid(entry.id), date: entry.date, name: entry.name, qty_label: entry.qtyLabel,
      kcal: entry.kcal, protein: entry.protein, carbs: entry.carbs, fat: entry.fat,
    });
  };

  const removeFood = (id: string) => {
    setFoods((prev) => {
      const next = prev.filter((f) => f.id !== id);
      try { localStorage.setItem(LS_FOODS, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    touchTs();
    void cloudDelete('corrida_foods', id);
  };

  const addWater = (date: string, ml: number) => {
    let finalMl = 0;
    setWater((prev) => {
      finalMl = Math.max(0, (prev[date] ?? 0) + ml);
      const next = { ...prev, [date]: finalMl };
      try { localStorage.setItem(LS_WATER, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    touchTs();
    const db = supabase;
    if (db && session) {
      const uid = session.user.id;
      setTimeout(async () => {
        try { await db.from('corrida_water').upsert({ user_id: uid, date, ml: finalMl }); } catch { /* ignore */ }
      }, 0);
    }
  };

  const setWaterGoal = (ml: number) => {
    setWaterGoalState(ml);
    try { localStorage.setItem(LS_WATER_GOAL, String(ml)); } catch { /* ignore */ }
    touchTs();
  };

  const addWorkout = (e: Omit<WorkoutEntry, 'id'>) => {
    const entry = { ...e, id: newId() };
    setWorkouts((prev) => {
      const next = [...prev, entry].sort((a, b) => b.date.localeCompare(a.date));
      try { localStorage.setItem(LS_WORKOUTS, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    touchTs();
    void cloudInsert('corrida_workouts', {
      id: ensureUuid(entry.id), date: entry.date, title: entry.title, done: entry.done,
      distance_km: entry.distanceKm, time_min: entry.timeMin, rpe: entry.rpe, notes: entry.notes,
    });
  };

  const removeWorkout = (id: string) => {
    setWorkouts((prev) => {
      const next = prev.filter((w) => w.id !== id);
      try { localStorage.setItem(LS_WORKOUTS, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    touchTs();
    void cloudDelete('corrida_workouts', id);
  };

  const setAiKey = (k: string) => {
    setAiKeyState(k.trim());
    try {
      if (k.trim()) localStorage.setItem(LS_AI_KEY, k.trim());
      else localStorage.removeItem(LS_AI_KEY);
    } catch { /* ignore */ }
    touchTs();
  };

  const setAiModel = (m: string) => {
    setAiModelState(m);
    try {
      if (m) localStorage.setItem(LS_AI_MODEL, m);
      else localStorage.removeItem(LS_AI_MODEL);
    } catch { /* ignore */ }
    touchTs();
  };

  const addChatMsg = (role: 'user' | 'model', text: string) => {
    setChatMsgs((prev) => {
      const next = [...prev, { role, text }].slice(-30);
      try { localStorage.setItem(LS_CHAT, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    touchTs();
    void cloudInsert('corrida_chat', { id: newId(), role, text });
  };

  const clearChat = () => {
    setChatMsgs([]);
    try { localStorage.removeItem(LS_CHAT); } catch { /* ignore */ }
    const db = supabase;
    if (db && session) {
      const uid = session.user.id;
      setTimeout(async () => {
        try { await db.from('corrida_chat').delete().eq('user_id', uid); } catch { /* ignore */ }
      }, 0);
    }
  };

  return (
    <Ctx.Provider value={{ user, setUser, resetUser, plan, regenerate, selectedDay, setSelectedDay, step, setStep, finished, setFinished, foods, addFood, removeFood, water, addWater, setWaterGoal, waterGoal, workouts, addWorkout, removeWorkout, aiKey, setAiKey, aiModel, setAiModel, chatMsgs, addChatMsg, clearChat, session, authReady, authError, signIn, signUp, signOut, offlineOk, setOfflineOk, cloudSyncing }}>
      {children}
    </Ctx.Provider>
  );
}

function traduzAuth(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/already registered|already exists|user already/i.test(msg)) return 'Este e-mail já tem conta. Use Entrar.';
  if (/password.*(short|least|6)/i.test(msg)) return 'A senha precisa de ao menos 6 caracteres.';
  if (/email.*invalid/i.test(msg)) return 'E-mail inválido.';
  return msg;
}

export function usePlan(): PlanState {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlan fora do PlanProvider');
  return v;
}

export { cloudEnabled };
