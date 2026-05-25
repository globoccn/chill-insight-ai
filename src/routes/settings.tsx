import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageTitle } from "@/components/layout/PageTitle";
import { DASHBOARD_DATA_URL, N8N_WEBHOOK_URL } from "@/lib/dashboard-data";
import {
  DashboardSettings,
  DEFAULT_DASHBOARD_SETTINGS,
  normalizeSettings,
  useSaveSettings,
  useSettings,
} from "@/lib/settings-data";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Building ESG Performance" },
      { name: "description", content: "Parâmetros operacionais, baselines, tarifas e metas ESG." },
    ],
  }),
  component: SettingsPage,
});

type NumericKey = Exclude<{
  [K in keyof DashboardSettings]: DashboardSettings[K] extends number | null ? K : never;
}[keyof DashboardSettings], undefined>;

type StringKey = Exclude<{
  [K in keyof DashboardSettings]: DashboardSettings[K] extends string ? K : never;
}[keyof DashboardSettings], undefined>;

function toInputValue(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return String(value).replace(".", ",");
}

function parseNumberInput(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;
  const parsed = Number(raw.replace(".", "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function Field({
  label,
  value,
  unit,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  unit?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex items-center rounded-xl border border-border bg-card focus-within:border-efficiency/50">
        <input
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/50"
        />
        {unit && <span className="pr-3 text-xs text-muted-foreground">{unit}</span>}
      </div>
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block md:col-span-2">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5 overflow-hidden rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">
        <code className="break-all">{value}</code>
      </div>
    </label>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function SettingsPage() {
  const settingsQuery = useSettings();
  const saveSettings = useSaveSettings();
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_DASHBOARD_SETTINGS);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(normalizeSettings(settingsQuery.data));
    }
  }, [settingsQuery.data]);

  const setNumber = (key: NumericKey, value: string) => {
    setSettings((current) => ({ ...current, [key]: parseNumberInput(value) }));
  };

  const setString = (key: StringKey, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const setChillerName = (key: keyof DashboardSettings["chiller_names"], value: string) => {
    setSettings((current) => ({
      ...current,
      chiller_names: {
        ...current.chiller_names,
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSavedMessage(null);
    const result = await saveSettings.mutateAsync(settings);
    setSavedMessage(
      result.source === "redis"
        ? "Settings salvas no Redis em cag:settings. O próximo processamento do n8n já pode usar estes valores."
        : "Settings salvas em memória local. Configure REDIS_REST_URL e REDIS_REST_TOKEN para persistir no Redis.",
    );
  };

  return (
    <AppShell>
      <PageTitle title="Settings" subtitle="Parâmetros usados pelo dashboard e pelo workflow n8n" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 p-4">
        <div>
          <div className="text-sm font-semibold">Persistência</div>
          <p className="text-xs text-muted-foreground">
            O botão salva em <code>cag:settings</code>. O n8n deve ler essa chave antes do node de cálculos.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveSettings.isPending}
          className="rounded-xl bg-efficiency px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saveSettings.isPending ? "Salvando..." : "Salvar Settings"}
        </button>
      </div>

      {settingsQuery.isError && (
        <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Não foi possível carregar as settings. Usando defaults locais.
        </div>
      )}

      {saveSettings.isError && (
        <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Erro ao salvar settings: {saveSettings.error.message}
        </div>
      )}

      {savedMessage && (
        <div className="mb-4 rounded-2xl border border-efficiency/30 bg-efficiency/10 p-4 text-sm text-efficiency">
          {savedMessage}
        </div>
      )}

      <Card title="Integração n8n">
        <ReadOnlyField label="Endpoint usado pelo dashboard" value={DASHBOARD_DATA_URL} />
        <ReadOnlyField label="Webhook n8n" value={N8N_WEBHOOK_URL} />
      </Card>

      <Card title="Carbono & Energia">
        <Field
          label="Fator nacional de emissão de carbono"
          value={toInputValue(settings.fator_carbono_kgco2_kwh)}
          unit="kgCO₂e/kWh"
          onChange={(value) => setNumber("fator_carbono_kgco2_kwh", value)}
        />
        <Field
          label="Tarifa de energia"
          value={toInputValue(settings.tarifa_kwh)}
          unit="R$/kWh"
          placeholder="A definir"
          onChange={(value) => setNumber("tarifa_kwh", value)}
        />
        <Field
          label="Baseline energético diário"
          value={toInputValue(settings.baseline_kwh_dia)}
          unit="kWh"
          placeholder="A definir"
          onChange={(value) => setNumber("baseline_kwh_dia", value)}
        />
        <Field
          label="Intervalo de coleta"
          value={toInputValue(settings.intervalo_horas)}
          unit="h"
          onChange={(value) => setNumber("intervalo_horas", value)}
        />
      </Card>

      <Card title="Metas ESG e Operação">
        <Field
          label="Eficiência meta"
          value={toInputValue(settings.meta_kwtr)}
          unit="kW/TR"
          onChange={(value) => setNumber("meta_kwtr", value)}
        />
        <Field
          label="Meta mensal de CO₂e"
          value={toInputValue(settings.meta_co2_mes_ton)}
          unit="tCO₂e"
          placeholder="A definir"
          onChange={(value) => setNumber("meta_co2_mes_ton", value)}
        />
        <Field
          label="Delta-T mínimo aceitável"
          value={toInputValue(settings.deltaT_evap_min)}
          unit="°C"
          onChange={(value) => setNumber("deltaT_evap_min", value)}
        />
        <Field
          label="Delta-T ideal"
          value={toInputValue(settings.deltaT_evap_ideal)}
          unit="°C"
          onChange={(value) => setNumber("deltaT_evap_ideal", value)}
        />
        <Field
          label="Limite pico de demanda"
          value={toInputValue(settings.limite_kw_pico)}
          unit="kW"
          placeholder="A definir"
          onChange={(value) => setNumber("limite_kw_pico", value)}
        />
        <Field
          label="Meta mensal de consumo"
          value={toInputValue(settings.meta_kwh_mes)}
          unit="kWh"
          placeholder="A definir"
          onChange={(value) => setNumber("meta_kwh_mes", value)}
        />
      </Card>

      <Card title="Edifício">
        <Field
          label="Área climatizada"
          value={toInputValue(settings.area_climatizada_m2)}
          unit="m²"
          placeholder="A definir"
          onChange={(value) => setNumber("area_climatizada_m2", value)}
        />
        <Field
          label="Capacidade nominal total"
          value={toInputValue(settings.capacidade_nominal_total_tr)}
          unit="TR"
          placeholder="Opcional"
          onChange={(value) => setNumber("capacidade_nominal_total_tr", value)}
        />
        <Field
          label="Horário operacional início"
          value={settings.horario_operacional_inicio}
          onChange={(value) => setString("horario_operacional_inicio", value)}
        />
        <Field
          label="Horário operacional fim"
          value={settings.horario_operacional_fim}
          onChange={(value) => setString("horario_operacional_fim", value)}
        />
        <Field
          label="Unidade de vazão"
          value={settings.unidade_vazao}
          onChange={(value) => setString("unidade_vazao", value)}
        />
      </Card>

      <Card title="Nomes dos chillers">
        <Field label="UR1" value={settings.chiller_names.ur1} onChange={(value) => setChillerName("ur1", value)} />
        <Field label="UR2" value={settings.chiller_names.ur2} onChange={(value) => setChillerName("ur2", value)} />
        <Field label="UR3" value={settings.chiller_names.ur3} onChange={(value) => setChillerName("ur3", value)} />
      </Card>

      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
        Para persistir de verdade no Redis, configure no ambiente do dashboard: <code>REDIS_REST_URL</code> e <code>REDIS_REST_TOKEN</code>. Sem isso, o app salva apenas em memória local para teste.
      </div>
    </AppShell>
  );
}
