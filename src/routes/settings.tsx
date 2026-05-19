import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageTitle } from "@/components/layout/PageTitle";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Building ESG Performance" }, { name: "description", content: "Parâmetros operacionais, baselines, tarifas e metas ESG." }] }),
  component: SettingsPage,
});

function Field({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex items-center rounded-xl border border-border bg-card focus-within:border-efficiency/50">
        <input defaultValue={value} className="w-full bg-transparent px-3.5 py-2.5 text-sm outline-none" />
        {unit && <span className="pr-3 text-xs text-muted-foreground">{unit}</span>}
      </div>
    </label>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function SettingsPage() {
  return (
    <AppShell>
      <PageTitle title="Settings" subtitle="Configurações da plataforma, baselines e metas ESG" />

      <Card title="Carbono & Energia">
        <Field label="Fator de emissão de carbono" value="0,442" unit="kgCO₂e/kWh" />
        <Field label="Tarifa de energia" value="0,82" unit="R$/kWh" />
        <Field label="Baseline energético mensal" value="465.000" unit="kWh" />
        <Field label="Baseline diário" value="15.000" unit="kWh" />
      </Card>

      <Card title="Metas ESG">
        <Field label="Meta mensal de kWh" value="420.000" unit="kWh" />
        <Field label="Meta mensal de CO₂e" value="185" unit="tCO₂e" />
        <Field label="Eficiência aceitável (kW/TR)" value="0,68" />
        <Field label="Delta-T mínimo aceitável" value="5,0" unit="°C" />
      </Card>

      <Card title="Edifício">
        <Field label="Área atendida" value="42.500" unit="m²" />
        <Field label="Horário operacional esperado" value="07:00 – 22:00" />
        <Field label="Unidade de vazão" value="m³/h" />
        <Field label="Capacidade nominal total" value="2.000" unit="TR" />
      </Card>

      <Card title="Nomes dos chillers">
        <Field label="Chiller 01" value="Chiller 01 — Carrier 23XRV" />
        <Field label="Chiller 02" value="Chiller 02 — Carrier 23XRV" />
        <Field label="Chiller 03" value="Chiller 03 — Carrier 23XRV" />
        <Field label="Chiller 04" value="Chiller 04 — Carrier 23XRV" />
        <Field label="Chiller 05" value="Chiller 05 — Carrier 23XRV" />
      </Card>

      <div className="flex justify-end gap-2">
        <button className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm">Descartar</button>
        <button className="rounded-xl bg-efficiency px-4 py-2.5 text-sm font-medium text-background">Salvar alterações</button>
      </div>
    </AppShell>
  );
}
