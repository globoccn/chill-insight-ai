import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface DashboardSettings {
  meta_kwtr: number;
  area_climatizada_m2: number | null;
  fator_carbono_kgco2_kwh: number;
  intervalo_horas: number;
  deltaT_evap_min: number;
  deltaT_evap_ideal: number;
  limite_kw_pico: number | null;
  tarifa_kwh: number | null;
  baseline_kwh_dia: number | null;
  meta_kwh_mes: number | null;
  meta_co2_mes_ton: number | null;
  horario_operacional_inicio: string;
  horario_operacional_fim: string;
  unidade_vazao: string;
  capacidade_nominal_total_tr: number | null;
  chiller_names: {
    ur1: string;
    ur2: string;
    ur3: string;
  };
}

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  meta_kwtr: 0.88,
  area_climatizada_m2: null,
  fator_carbono_kgco2_kwh: 0.0385,
  intervalo_horas: 0.25,
  deltaT_evap_min: 4,
  deltaT_evap_ideal: 5.5,
  limite_kw_pico: null,
  tarifa_kwh: null,
  baseline_kwh_dia: null,
  meta_kwh_mes: null,
  meta_co2_mes_ton: null,
  horario_operacional_inicio: "08:00",
  horario_operacional_fim: "18:00",
  unidade_vazao: "m³/h",
  capacidade_nominal_total_tr: null,
  chiller_names: {
    ur1: "UR1",
    ur2: "UR2",
    ur3: "UR3",
  },
};

export function normalizeSettings(value: Partial<DashboardSettings> | null | undefined): DashboardSettings {
  return {
    ...DEFAULT_DASHBOARD_SETTINGS,
    ...(value ?? {}),
    chiller_names: {
      ...DEFAULT_DASHBOARD_SETTINGS.chiller_names,
      ...(value?.chiller_names ?? {}),
    },
  };
}

export async function getSettings(): Promise<DashboardSettings> {
  const response = await fetch("/api/settings", {
    method: "GET",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Falha ao carregar settings: ${response.status}`);
  }

  const payload = await response.json();
  return normalizeSettings(payload?.settings ?? payload);
}

export async function saveSettings(settings: DashboardSettings): Promise<{ success: boolean; source?: string }> {
  const response = await fetch("/api/settings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Falha ao salvar settings: ${response.status}`);
  }

  return response.json();
}

export function useSettings() {
  return useQuery({
    queryKey: ["dashboard-settings"],
    queryFn: getSettings,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useSaveSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-settings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
  });
}
