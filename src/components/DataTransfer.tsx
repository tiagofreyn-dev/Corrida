import { useRef, useState } from 'react';

// Chaves do app no localStorage (espelha PlanContext + Duvidas)
const KEYS = [
  'runna-like-user-v1',
  'runna-like-finished-v1',
  'runna-like-step-v1',
  'runna-like-foods-v1',
  'runna-like-water-v1',
  'runna-like-watergoal-v1',
  'runna-like-workouts-v1',
  'runna-like-aikey-v1',
  'runna-like-aimodel-v1',
  'runna-like-duvidas-v1',
];

/** Exporta/importa todos os dados (para levar do PC ao celular e vice-versa). */
export default function DataTransfer() {
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const exportar = () => {
    const data: Record<string, string | null> = {};
    KEYS.forEach((k) => { data[k] = localStorage.getItem(k); });
    const blob = new Blob([JSON.stringify({ app: 'planilha-integrada', v: 1, data })], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `planilha-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg('✅ Backup baixado. Envie o arquivo para o celular (WhatsApp/e-mail) e importe por lá.');
  };

  const importar = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || parsed.app !== 'planilha-integrada' || typeof parsed.data !== 'object') {
          throw new Error('formato');
        }
        let n = 0;
        KEYS.forEach((k) => {
          const v = parsed.data[k];
          if (typeof v === 'string') { localStorage.setItem(k, v); n++; }
        });
        setMsg(`✅ ${n} itens importados. Recarregando...`);
        setTimeout(() => window.location.reload(), 1200);
      } catch {
        setMsg('❌ Arquivo inválido. Use um backup gerado pelo botão Exportar.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="card">
      <h3>💾 Meus dados (PC ↔ celular)</h3>
      <p className="hint">
        O app não tem conta nem nuvem: cada aparelho guarda o seu. Para levar tudo ao celular,
        exporte aqui, envie o arquivo para você mesmo e importe no celular.
        O arquivo inclui sua chave da IA — guarde com cuidado.
      </p>
      <div className="wizard-nav">
        <button className="btn ghost" onClick={exportar}>⬇️ Exportar tudo</button>
        <button className="btn primary" onClick={() => fileRef.current?.click()}>⬆️ Importar backup</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importar(f);
            e.target.value = '';
          }}
        />
      </div>
      {msg && <p className="hint">{msg}</p>}
    </div>
  );
}
