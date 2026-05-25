import { Calendar, CheckCircle2, Download, Moon, Sun, ChevronDown } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { formatDate, formatDateTime, useDashboardData } from "@/lib/dashboard-data";

export function Header() {
  const { theme, toggle } = useTheme();
  const { data } = useDashboardData();

  const analyzedDate = formatDate(data?.overview.periodo_fim);
  const lastImport = formatDateTime(data?.overview.periodo_fim);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="flex h-[68px] items-center gap-4 px-6">
        <button className="group inline-flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm shadow-sm transition hover:border-efficiency/40">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div className="text-left leading-tight">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Período analisado</div>
            <div className="text-[13px] font-medium">{analyzedDate}</div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        <div className="inline-flex items-center gap-2 rounded-full border border-efficiency/30 bg-efficiency/10 px-3 py-1.5 text-xs font-medium text-efficiency">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Dados consolidados pelo n8n
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end leading-tight">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Último ponto</span>
            <span className="inline-flex items-center gap-2 text-[13px] font-medium">
              {lastImport}
              <span className="h-2 w-2 rounded-full bg-efficiency shadow-[0_0_8px_var(--color-efficiency)]" />
            </span>
          </div>

          <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium shadow-sm transition hover:border-efficiency/40">
            <Download className="h-4 w-4" />
            Exportar relatório
          </button>

          <button onClick={toggle} aria-label="Alternar tema" className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-1 shadow-sm">
            <span className={["grid h-7 w-7 place-items-center rounded-full transition", theme === "light" ? "bg-warning/20 text-warning" : "text-muted-foreground"].join(" ")}><Sun className="h-3.5 w-3.5" /></span>
            <span className={["grid h-7 w-7 place-items-center rounded-full transition", theme === "dark" ? "bg-efficiency/20 text-efficiency" : "text-muted-foreground"].join(" ")}><Moon className="h-3.5 w-3.5" /></span>
          </button>

          <div className="flex items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 py-1 text-sm shadow-sm">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-efficiency to-esg text-[11px] font-semibold text-background">AS</div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </header>
  );
}
