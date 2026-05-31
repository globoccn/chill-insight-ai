import { Calendar, CheckCircle2, Moon, Sun, ChevronDown, Download, Loader2, LogOut } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { formatDate, formatDateTime, useDashboardData } from "@/lib/dashboard-data";
import { periodLabels, setDashboardPeriod, useDashboardPeriod, type DashboardPeriod } from "@/lib/period";
import { logoutDemo } from "@/lib/auth";
import { downloadReportPdf, isoDateOnly, reportPeriodLabels } from "@/lib/report-download";
import { useState } from "react";

export function Header() {
  const { theme, toggle } = useTheme();
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const { data } = useDashboardData();
  const period = useDashboardPeriod();
  const periods: DashboardPeriod[] = ["day", "week", "month"];

  const startDate = formatDate(data?.overview.periodo_inicio);
  const endDate = formatDate(data?.overview.periodo_fim);
  const analyzedDate = period === "day" || startDate === endDate ? endDate : `${startDate} – ${endDate}`;
  const lastImport = formatDateTime(data?.overview.periodo_fim);
  const reportDate = isoDateOnly(data?.overview.periodo_fim);

  async function handleDownloadReport() {
    if (isDownloadingReport) return;

    setIsDownloadingReport(true);
    try {
      await downloadReportPdf(period, reportDate);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível baixar o relatório agora.";
      window.alert(message);
    } finally {
      setIsDownloadingReport(false);
    }
  }

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
          Dados consolidados
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end leading-tight">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Último ponto</span>
            <span className="inline-flex items-center gap-2 text-[13px] font-medium">
              {lastImport}
              <span className="h-2 w-2 rounded-full bg-efficiency shadow-[0_0_8px_var(--color-efficiency)]" />
            </span>
          </div>

          <div className="hidden sm:flex items-center rounded-xl border border-border bg-card p-1 shadow-sm">
            {periods.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setDashboardPeriod(item)}
                className={[
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  period === item
                    ? "bg-efficiency/15 text-efficiency shadow-[0_0_18px_rgba(0,210,150,0.16)]"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {periodLabels[item]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={isDownloadingReport || !data}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-efficiency/30 bg-efficiency/10 px-3 text-xs font-semibold text-efficiency shadow-sm transition hover:border-efficiency/60 hover:bg-efficiency/15 disabled:cursor-not-allowed disabled:opacity-60"
            title={`Baixar relatório ${reportPeriodLabels[period]}`}
          >
            {isDownloadingReport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span className="hidden lg:inline">Relatório {reportPeriodLabels[period]}</span>
            <span className="lg:hidden">PDF</span>
          </button>

          <button onClick={toggle} aria-label="Alternar tema" className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-1 shadow-sm">
            <span className={["grid h-7 w-7 place-items-center rounded-full transition", theme === "light" ? "bg-warning/20 text-warning" : "text-muted-foreground"].join(" ")}><Sun className="h-3.5 w-3.5" /></span>
            <span className={["grid h-7 w-7 place-items-center rounded-full transition", theme === "dark" ? "bg-efficiency/20 text-efficiency" : "text-muted-foreground"].join(" ")}><Moon className="h-3.5 w-3.5" /></span>
          </button>

          <button
            type="button"
            onClick={() => logoutDemo()}
            className="flex items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 py-1 text-sm shadow-sm transition hover:border-critical/40 hover:text-critical"
            title="Sair"
          >
            <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-efficiency to-esg text-[11px] font-semibold text-background">AS</div>
            <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}
