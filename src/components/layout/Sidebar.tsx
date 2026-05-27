import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Leaf,
  Snowflake,
  LineChart,
  FileBarChart,
  Settings,
  Gauge,
} from "lucide-react";
import { useDashboardData } from "@/lib/dashboard-data";

const nav = [
  { to: "/",         label: "Overview",  icon: LayoutDashboard },
  { to: "/esg",      label: "ESG",       icon: Leaf },
  { to: "/chillers", label: "Chillers",  icon: Snowflake },
  { to: "/analytics",label: "Analytics", icon: LineChart },
  { to: "/reports",  label: "Reports",   icon: FileBarChart },
  { to: "/settings", label: "Settings",  icon: Settings },
] as const;

function scoreFromDeviation(deviation?: number | null) {
  if (deviation === null || deviation === undefined) return 0;
  return Math.max(0, Math.min(100, Math.round(100 - Math.max(0, deviation) * 3)));
}

function scoreLabel(score: number) {
  if (score >= 85) return "Muito Bom";
  if (score >= 70) return "Bom";
  if (score > 0) return "Atenção";
  return "Sem dados";
}

export function Sidebar() {
  const { pathname } = useLocation();
  const { data } = useDashboardData();
  const score = scoreFromDeviation(data?.overview.desvio_meta_kwtr ?? null);
  const label = scoreLabel(score);

  return (
    <aside className="hidden lg:flex w-[244px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="px-6 pt-6 pb-8">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-efficiency to-esg text-background shadow-lg">
            <Gauge className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold leading-tight tracking-tight">
              Building ESG
              <br />Performance
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Central de Água Gelada</div>
          </div>
        </div>
      </div>

      <nav className="px-3 space-y-1">
        {nav.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={[
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-sidebar-accent text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              ].join(" ")}
            >
              <Icon className={["h-4 w-4", active ? "text-efficiency" : ""].join(" ")} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-4 pb-8 -translate-y-6">
        <div className="rounded-2xl border border-sidebar-border bg-card/60 p-5 text-center">
          <div className="text-xs font-medium text-muted-foreground">ESG Performance Score</div>
          <div className="relative mx-auto mt-3 grid h-28 w-28 place-items-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r="44" stroke="currentColor" className="text-muted/40" strokeWidth="8" fill="none" />
              <circle
                cx="50" cy="50" r="44"
                stroke="currentColor"
                className="text-efficiency"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${(score / 100) * 276} 276`}
              />
            </svg>
            <div className="text-center">
              <div className="text-3xl font-semibold tracking-tight">{score || "—"}</div>
              <div className="text-[10px] text-muted-foreground">/100</div>
            </div>
          </div>
          <div className="mt-2 text-sm font-medium text-efficiency">{label}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">Dados reais</div>
        </div>
      </div>
    </aside>
  );
}
