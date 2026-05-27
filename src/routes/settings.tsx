import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageTitle } from "@/components/layout/PageTitle";
import {
  areSettingsEquivalent,
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

  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  const normalized = hasComma
    ? raw.replace(/\./g, "").replace(",", ".")
    : hasDot
      ? raw.replace(/,/g, "")
      : raw;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function Field({
  label,
  value,
  unit,
  onChange,
  onBlur,
  placeholder,
}: {
  label: string;
  value: string;
  unit?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
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
          onBlur={onBlur}
          inputMode="decimal"
          className="w-full bg-transparent px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/50"
        />
        {unit && <span className="pr-3 text-xs text-muted-foreground">{unit}</span>}
      </div>
    </label>
  );
}

function NumericField({
  label,
  value,
  unit,
  onCommit,
  placeholder,
}: {
  label: string;
  value: number | null | undefined;
  unit?: string;
  onCommit: (value: string) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(toInputValue(value));

  useEffect(() => {
    setDraft(toInputValue(value));
  }, [value]);

  const commit = () => {
    onCommit(draft);
  };

  const handleChange = (next: string) => {
    setDraft(next);

    const trimmed = next.trim();
    // Permite digitar vírgula decimal sem o React transformar "0," em "0".
    // Assim campos como tarifa aceitam naturalmente "0,49".
    if (!trimmed || !/[,.]$/.test(trimmed)) {
      onCommit(next);
    }
  };

  return (
    <Field
      label={label}
      value={draft}
      unit={unit}
      placeholder={placeholder}
      onChange={handleChange}
      onBlur={commit}
    />
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
    const payload = normalizeSettings(settings);
    const result = await saveSettings.mutateAsync(payload);
    const saved = normalizeSettings(result.saved ?? payload);
    const persisted = result.persisted ? normalizeSettings(result.persisted) : undefined;
    const confirmed = persisted && areSettingsEquivalent(saved, persisted) ? persisted : saved;

    setSettings(confirmed);

    if (persisted && !areSettingsEquivalent(saved, persisted)) {
      setSavedMessage(
        `Settings enviadas, mas a confirmação imediata ainda retornou outro valor. Mantive o valor salvo na tela. Verifique se o serviço de dados está gravando cag:settings com o body recebido.`,
      );
      return;
    }

    setSavedMessage(
      persisted
        ? `Settings salvas e confirmadas em cag:settings. Atualizando a página...`
        : `Settings enviadas. Atualizando a página...`,
    );

    window.setTimeout(() => {
      window.location.reload();
    }, 700);
  };

  return (
    <AppShell>
      <PageTitle title="Settings" subtitle="Parâmetros usados pelo dashboard" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 p-4">
        <div>
          <div className="text-sm font-semibold">Persistência</div>
          <p className="text-xs text-muted-foreground">
            O botão salva em <code>cag:settings</code>.
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

      <Card title="Carbono & Energia">
        <NumericField
          label="Fator de emissão de carbono"
          value={settings.fator_carbono_kgco2_kwh}
          unit="kgCO₂e/kWh"
          onCommit={(value) => setNumber("fator_carbono_kgco2_kwh", value)}
        />
        <NumericField
          label="Tarifa de energia"
          value={settings.tarifa_kwh}
          unit="R$/kWh"
          placeholder="A definir"
          onCommit={(value) => setNumber("tarifa_kwh", value)}
        />
        <NumericField
          label="Baseline energético diário"
          value={settings.baseline_kwh_dia}
          unit="kWh"
          placeholder="A definir"
          onCommit={(value) => setNumber("baseline_kwh_dia", value)}
        />
        <NumericField
          label="Intervalo de coleta"
          value={settings.intervalo_horas}
          unit="h"
          onCommit={(value) => setNumber("intervalo_horas", value)}
        />
      </Card>

      <Card title="Metas ESG e Operação">
        <NumericField
          label="Eficiência meta"
          value={settings.meta_kwtr}
          unit="kW/TR"
          onCommit={(value) => setNumber("meta_kwtr", value)}
        />
        <NumericField
          label="Meta mensal de CO₂e"
          value={settings.meta_co2_mes_ton}
          unit="tCO₂e"
          placeholder="A definir"
          onCommit={(value) => setNumber("meta_co2_mes_ton", value)}
        />
        <NumericField
          label="Delta-T mínimo aceitável"
          value={settings.deltaT_evap_min}
          unit="°C"
          onCommit={(value) => setNumber("deltaT_evap_min", value)}
        />
        <NumericField
          label="Delta-T ideal"
          value={settings.deltaT_evap_ideal}
          unit="°C"
          onCommit={(value) => setNumber("deltaT_evap_ideal", value)}
        />
        <NumericField
          label="Limite pico de demanda"
          value={settings.limite_kw_pico}
          unit="kW"
          placeholder="A definir"
          onCommit={(value) => setNumber("limite_kw_pico", value)}
        />
        <NumericField
          label="Meta mensal de consumo"
          value={settings.meta_kwh_mes}
          unit="kWh"
          placeholder="A definir"
          onCommit={(value) => setNumber("meta_kwh_mes", value)}
        />
      </Card>

      <Card title="Edifício">
        <NumericField
          label="Área climatizada"
          value={settings.area_climatizada_m2}
          unit="m²"
          placeholder="A definir"
          onCommit={(value) => setNumber("area_climatizada_m2", value)}
        />
        <NumericField
          label="Capacidade nominal total"
          value={settings.capacidade_nominal_total_tr}
          unit="TR"
          placeholder="Opcional"
          onCommit={(value) => setNumber("capacidade_nominal_total_tr", value)}
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

      <div className="rounded-2xl border border-efficiency/30 bg-efficiency/10 p-4 text-sm text-efficiency">
        As Settings são salvas em <code>cag:settings</code> para uso pelos cálculos do dashboard.
      </div>
    </AppShell>
  );
}
