import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { N8N_SETTINGS_URL, SETTINGS_URL } from "@/lib/dashboard-data";

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

type SettingsPayload = Partial<DashboardSettings> & Record<string, unknown>;

type SaveSettingsResult = {
  success: boolean;
  source?: string;
  saved?: DashboardSettings;
  persisted?: DashboardSettings;
  endpoint?: string;
  serviceResponse?: unknown;
  persistenceConfirmed?: boolean;
  persistenceMismatch?: boolean;
};

const NUMERIC_KEYS = [
  "meta_kwtr",
  "area_climatizada_m2",
  "fator_carbono_kgco2_kwh",
  "intervalo_horas",
  "deltaT_evap_min",
  "deltaT_evap_ideal",
  "limite_kw_pico",
  "tarifa_kwh",
  "baseline_kwh_dia",
  "meta_kwh_mes",
  "meta_co2_mes_ton",
  "capacidade_nominal_total_tr",
] as const satisfies readonly (keyof DashboardSettings)[];

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function unwrapSettingsPayload(value: unknown): SettingsPayload {
  const parsed = parseMaybeJson(value);

  if (Array.isArray(parsed)) {
    return unwrapSettingsPayload(parsed[0]);
  }

  if (!parsed || typeof parsed !== "object") return {};

  const payload = parsed as Record<string, unknown>;

  // Formatos comuns que podem vir do serviço de dados/proxy:
  // objeto direto, { settings }, { body }, { data }, { json } ou array com um item.
  for (const key of ["settings", "body", "data", "json"] as const) {
    const nested = parseMaybeJson(payload[key]);
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const nestedPayload = nested as Record<string, unknown>;
      if (nestedPayload.settings && typeof nestedPayload.settings === "object" && !Array.isArray(nestedPayload.settings)) {
        return nestedPayload.settings as SettingsPayload;
      }
      return nestedPayload as SettingsPayload;
    }
  }

  return payload as SettingsPayload;
}

function parseDecimal(value: unknown, fallback: number | null): number | null {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value !== "string") return fallback;

  const raw = value.trim();
  if (!raw) return fallback;

  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  const normalized = hasComma
    ? raw.replace(/\./g, "").replace(",", ".")
    : hasDot
      ? raw.replace(/,/g, "")
      : raw;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

export function areSettingsEquivalent(a: DashboardSettings, b: DashboardSettings): boolean {
  const normalizedA = normalizeSettings(a);
  const normalizedB = normalizeSettings(b);
  return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
}

export function normalizeSettings(value: unknown): DashboardSettings {
  const input = unwrapSettingsPayload(value);
  const normalized: DashboardSettings = {
    ...DEFAULT_DASHBOARD_SETTINGS,
    ...input,
    chiller_names: {
      ...DEFAULT_DASHBOARD_SETTINGS.chiller_names,
      ...(input.chiller_names && typeof input.chiller_names === "object" && !Array.isArray(input.chiller_names)
        ? input.chiller_names
        : {}),
    },
  };

  for (const key of NUMERIC_KEYS) {
    normalized[key] = parseDecimal(input[key], DEFAULT_DASHBOARD_SETTINGS[key] as number | null) as never;
  }

  normalized.horario_operacional_inicio = parseString(input.horario_operacional_inicio, DEFAULT_DASHBOARD_SETTINGS.horario_operacional_inicio);
  normalized.horario_operacional_fim = parseString(input.horario_operacional_fim, DEFAULT_DASHBOARD_SETTINGS.horario_operacional_fim);
  normalized.unidade_vazao = parseString(input.unidade_vazao, DEFAULT_DASHBOARD_SETTINGS.unidade_vazao);
  normalized.chiller_names = {
    ur1: parseString(normalized.chiller_names.ur1, DEFAULT_DASHBOARD_SETTINGS.chiller_names.ur1),
    ur2: parseString(normalized.chiller_names.ur2, DEFAULT_DASHBOARD_SETTINGS.chiller_names.ur2),
    ur3: parseString(normalized.chiller_names.ur3, DEFAULT_DASHBOARD_SETTINGS.chiller_names.ur3),
  };

  return normalized;
}

async function readJsonOrText(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function settingsEndpoints(): string[] {
  return Array.from(new Set([SETTINGS_URL, N8N_SETTINGS_URL].filter(Boolean)));
}

export async function getSettings(): Promise<DashboardSettings> {
  const errors: string[] = [];

  for (const endpoint of settingsEndpoints()) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: { accept: "application/json,text/plain,*/*" },
        cache: "no-store",
      });

      const payload = await readJsonOrText(response);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (payload && typeof payload === "object" && "error" in (payload as Record<string, unknown>)) {
        throw new Error(String((payload as { message?: unknown }).message || "serviço de dados retornou erro"));
      }

      return normalizeSettings(payload);
    } catch (error) {
      errors.push(`${endpoint}: ${(error as Error).message}`);
    }
  }

  throw new Error(`Falha ao carregar settings. Tentativas: ${errors.join(" | ")}`);
}

export async function saveSettings(settings: DashboardSettings): Promise<SaveSettingsResult> {
  const payload = normalizeSettings(settings);
  const errors: string[] = [];

  for (const endpoint of settingsEndpoints()) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json,text/plain,*/*",
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = await readJsonOrText(response);

      if (!response.ok) {
        const detail = typeof responsePayload === "string" ? responsePayload : JSON.stringify(responsePayload);
        throw new Error(detail || `HTTP ${response.status}`);
      }

      const result = responsePayload && typeof responsePayload === "object" ? (responsePayload as Record<string, unknown>) : {};

      const saved = normalizeSettings(result.saved ?? payload);
      const persisted = result.persisted ? normalizeSettings(result.persisted) : undefined;
      const persistenceConfirmed = persisted ? areSettingsEquivalent(saved, persisted) : false;

      return {
        ...result,
        success: true,
        endpoint,
        source: typeof result.source === "string" ? result.source : endpoint === N8N_SETTINGS_URL ? "service-direct" : "dashboard-proxy",
        saved,
        persisted,
        persistenceConfirmed,
        persistenceMismatch: Boolean(persisted && !persistenceConfirmed),
        serviceResponse: result.serviceResponse,
      };
    } catch (error) {
      errors.push(`${endpoint}: ${(error as Error).message}`);
    }
  }

  throw new Error(`Falha ao salvar settings. Tentativas: ${errors.join(" | ")}`);
}

export function useSettings() {
  return useQuery({
    queryKey: ["dashboard-settings", SETTINGS_URL, N8N_SETTINGS_URL],
    queryFn: getSettings,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useSaveSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveSettings,
    onSuccess: (result, variables) => {
      const saved = normalizeSettings(result.saved ?? variables);
      const confirmed = result.persistenceConfirmed && result.persisted ? result.persisted : saved;

      // Não invalida imediatamente ["dashboard-settings"].
      // Se o serviço de dados ainda devolver o valor antigo por alguns ms, o refetch sobrescreve a edição local
      // e o campo parece “voltar” para 0,88 logo após salvar.
      queryClient.setQueryData(["dashboard-settings", SETTINGS_URL, N8N_SETTINGS_URL], confirmed);
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
  });
}
