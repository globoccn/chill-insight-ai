import { useSyncExternalStore } from "react";

export type DashboardPeriod = "day" | "week" | "month";

const STORAGE_KEY = "besg-dashboard-period";
const EVENT_NAME = "besg-dashboard-period-change";

function normalizePeriod(value: unknown): DashboardPeriod {
  return value === "week" || value === "month" || value === "day" ? value : "day";
}

export function getDashboardPeriod(): DashboardPeriod {
  if (typeof window === "undefined") return "day";
  return normalizePeriod(window.localStorage.getItem(STORAGE_KEY));
}

export function setDashboardPeriod(period: DashboardPeriod) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, period);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: period }));
}

export function useDashboardPeriod() {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const handler = () => onStoreChange();
      window.addEventListener(EVENT_NAME, handler);
      window.addEventListener("storage", handler);
      return () => {
        window.removeEventListener(EVENT_NAME, handler);
        window.removeEventListener("storage", handler);
      };
    },
    getDashboardPeriod,
    () => "day",
  );
}

export const periodLabels: Record<DashboardPeriod, string> = {
  day: "D-1",
  week: "Semana",
  month: "Mês",
};
