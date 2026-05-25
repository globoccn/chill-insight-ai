import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}


type DashboardSettings = Record<string, unknown>;

const SETTINGS_KEY = "cag:settings";

const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
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

let memorySettings: DashboardSettings | undefined;

function getEnvValue(env: unknown, key: string): string | undefined {
  const fromEnv = env && typeof env === "object" ? (env as Record<string, unknown>)[key] : undefined;
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv;

  const proc = globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } };
  const fromProcess = proc.process?.env?.[key];
  return fromProcess && fromProcess.trim() ? fromProcess : undefined;
}

async function redisRestCommand(env: unknown, command: unknown[]): Promise<unknown> {
  const restUrl = getEnvValue(env, "REDIS_REST_URL") || getEnvValue(env, "UPSTASH_REDIS_REST_URL");
  const restToken = getEnvValue(env, "REDIS_REST_TOKEN") || getEnvValue(env, "UPSTASH_REDIS_REST_TOKEN");

  if (!restUrl || !restToken) {
    return undefined;
  }

  const response = await fetch(restUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${restToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw new Error(`Redis REST error ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as { result?: unknown; error?: string };
  if (payload.error) throw new Error(payload.error);
  return payload.result;
}

function normalizeSettings(value: unknown): DashboardSettings {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  const obj = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as DashboardSettings : {};
  const chillerNames = obj.chiller_names && typeof obj.chiller_names === "object" ? obj.chiller_names as Record<string, unknown> : {};

  return {
    ...DEFAULT_DASHBOARD_SETTINGS,
    ...obj,
    chiller_names: {
      ...(DEFAULT_DASHBOARD_SETTINGS.chiller_names as Record<string, unknown>),
      ...chillerNames,
    },
  };
}

async function readSettings(env: unknown): Promise<{ settings: DashboardSettings; source: string }> {
  const redisValue = await redisRestCommand(env, ["GET", SETTINGS_KEY]);
  if (redisValue) {
    return { settings: normalizeSettings(redisValue), source: "redis" };
  }

  if (memorySettings) {
    return { settings: normalizeSettings(memorySettings), source: "memory" };
  }

  return { settings: normalizeSettings(DEFAULT_DASHBOARD_SETTINGS), source: "default" };
}

async function writeSettings(env: unknown, settings: DashboardSettings): Promise<{ settings: DashboardSettings; source: string }> {
  const normalized = normalizeSettings(settings);
  const redisResult = await redisRestCommand(env, ["SET", SETTINGS_KEY, JSON.stringify(normalized)]);

  if (redisResult !== undefined) {
    return { settings: normalized, source: "redis" };
  }

  memorySettings = normalized;
  return { settings: normalized, source: "memory" };
}

async function handleSettingsRequest(request: Request, env: unknown): Promise<Response> {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
  });

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method === "GET") {
    const result = await readSettings(env);
    return new Response(JSON.stringify(result), { status: 200, headers });
  }

  if (request.method === "POST") {
    const body = await request.json();
    const result = await writeSettings(env, body as DashboardSettings);
    return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
}


const N8N_DASHBOARD_WEBHOOK_URL = "https://ancar-n8n.gpfgqx.easypanel.host/webhook/dados-globo-vm22";

async function proxyDashboardRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const isUpload = url.pathname === "/api/dashboard/upload";
  const target = new URL(N8N_DASHBOARD_WEBHOOK_URL);
  target.search = url.search;

  const headers = isUpload ? new Headers(request.headers) : new Headers({ accept: "application/json" });
  headers.delete("host");

  const init: RequestInit = {
    method: isUpload ? "POST" : "GET",
    headers,
    body: isUpload ? request.body : undefined,
  };

  const response = await fetch(target.toString(), init);
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  return new Response(response.body, { status: response.status, headers });
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    if (url.pathname === "/api/settings") {
      return handleSettingsRequest(request, env);
    }

    if (url.pathname === "/api/dashboard" || url.pathname === "/api/dashboard/upload") {
      return proxyDashboardRequest(request);
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
