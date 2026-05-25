import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageTitle } from "@/components/layout/PageTitle";
import { DASHBOARD_DATA_URL, N8N_WEBHOOK_URL } from "@/lib/dashboard-data";

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
  return <div className="glass-card rounded-2xl p-5"><h3 className="text-[15px] font-semibold tracking-tight">{title}</h3><div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div></div>;
}

function SettingsPage() {
  return (
    <AppShell>
      <PageTitle title="Settings" subtitle="Parâmetros provisórios usados pelo n8n e pelo dashboard" />

      <Card title="Integração n8n">
        <Field label="Endpoint usado pelo dashboard" value={DASHBOARD_DATA_URL} />
        <Field label="Webhook n8n" value={N8N_WEBHOOK_URL} />
      </Card>

      <Card title="Carbono & Energia">
        <Field label="Fator nacional de emissão de carbono" value="0,0385" unit="kgCO₂e/kWh" />
        <Field label="Tarifa de energia" value="A definir" unit="R$/kWh" />
        <Field label="Baseline energético diário" value="A definir" unit="kWh" />
        <Field label="Intervalo de coleta" value="0,25" unit="h" />
      </Card>

      <Card title="Metas ESG">
        <Field label="Eficiência meta" value="0,88" unit="kW/TR" />
        <Field label="Meta mensal de CO₂e" value="A definir" unit="tCO₂e" />
        <Field label="Delta-T mínimo aceitável" value="4,0" unit="°C" />
        <Field label="Delta-T ideal" value="5,5" unit="°C" />
      </Card>

      <Card title="Edifício">
        <Field label="Área climatizada" value="A definir" unit="m²" />
        <Field label="Horário operacional esperado" value="08:00 – 18:00" />
        <Field label="Unidade de vazão" value="m³/h" />
        <Field label="Capacidade nominal total" value="Opcional" unit="TR" />
      </Card>

      <Card title="Nomes dos chillers">
        <Field label="UR1" value="UR1" />
        <Field label="UR2" value="UR2" />
        <Field label="UR3" value="UR3" />
      </Card>

      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
        Estes campos ainda são visuais. A persistência definitiva deve gravar os parâmetros no Redis/banco ou no próprio workflow n8n.
      </div>
    </AppShell>
  );
}
