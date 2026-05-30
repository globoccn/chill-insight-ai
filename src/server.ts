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

const DEFAULT_N8N_BASE_URL = "https://ancar-n8n.gpfgqx.easypanel.host/webhook";

function getEnvValue(env: unknown, key: string): string | undefined {
  const fromEnv = env && typeof env === "object" ? (env as Record<string, unknown>)[key] : undefined;
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim();

  const proc = globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } };
  const fromProcess = proc.process?.env?.[key];
  return fromProcess && fromProcess.trim() ? fromProcess.trim() : undefined;
}

function getN8nBaseUrl(env: unknown): string {
  return (
    getEnvValue(env, "VITE_API_URL") ||
    getEnvValue(env, "N8N_API_URL") ||
    getEnvValue(env, "N8N_WEBHOOK_BASE_URL") ||
    DEFAULT_N8N_BASE_URL
  ).replace(/\/+$/, "");
}


const DEFAULT_SETTINGS_PAYLOAD = {
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

function normalizeSettingsPayload(input: unknown) {
  const body = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const chillerNames = body.chiller_names && typeof body.chiller_names === "object"
    ? (body.chiller_names as Record<string, unknown>)
    : {};

  return {
    ...DEFAULT_SETTINGS_PAYLOAD,
    ...body,
    chiller_names: {
      ...DEFAULT_SETTINGS_PAYLOAD.chiller_names,
      ...chillerNames,
    },
  };
}

async function postSettingsToN8n(request: Request, env: unknown): Promise<Response> {
  let payload: unknown = {};

  try {
    const text = await request.text();
    payload = text ? JSON.parse(text) : {};
  } catch (error) {
    return new Response(
      JSON.stringify({ error: true, message: "JSON inválido recebido em /api/settings", detail: error instanceof Error ? error.message : String(error) }),
      { status: 400, headers: jsonHeaders({ "content-type": "application/json; charset=utf-8" }) },
    );
  }

  const normalized = normalizeSettingsPayload(payload);
  const target = `${getN8nBaseUrl(env)}/dashboard-settings`;

  const saveResponse = await fetch(target, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json,text/plain,*/*",
    },
    body: JSON.stringify(normalized),
  });

  const saveText = await saveResponse.text().catch(() => "");

  if (!saveResponse.ok) {
    return new Response(
      JSON.stringify({
        error: true,
        message: "serviço de dados recusou o POST /dashboard-settings",
        status: saveResponse.status,
        detail: saveText,
        sent: normalized,
      }),
      { status: saveResponse.status, headers: jsonHeaders({ "content-type": "application/json; charset=utf-8" }) },
    );
  }

  // Validação pós-salvamento: lê novamente o webhook GET para confirmar o que ficou no Redis.
  let persisted: unknown = null;
  try {
    const verifyResponse = await fetch(`${target}?_=${Date.now()}`, {
      method: "GET",
      headers: { accept: "application/json,text/plain,*/*" },
    });
    const verifyText = await verifyResponse.text();
    persisted = verifyText ? JSON.parse(verifyText) : null;
  } catch {
    persisted = null;
  }

  return new Response(
    JSON.stringify({
      success: true,
      source: "service",
      saved: normalized,
      persisted,
      serviceResponse: saveText ? (() => { try { return JSON.parse(saveText); } catch { return saveText; } })() : null,
    }),
    { status: 200, headers: jsonHeaders({ "content-type": "application/json; charset=utf-8" }) },
  );
}

function jsonHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
  headers.set("access-control-allow-headers", "content-type,authorization");
  return headers;
}

async function proxyToN8n(request: Request, env: unknown, path: string, method?: string): Promise<Response> {
  const incomingUrl = new URL(request.url);
  const target = new URL(`${getN8nBaseUrl(env)}/${path.replace(/^\/+/, "")}`);
  target.search = incomingUrl.search;

  const finalMethod = method ?? request.method;
  const hasBody = !["GET", "HEAD"].includes(finalMethod.toUpperCase());

  // Não repassamos todos os headers do browser para o serviço de dados.
  // Host/content-length/encoding podem quebrar POST em alguns runtimes.
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");
  if (contentType) headers.set("content-type", contentType);
  if (accept) headers.set("accept", accept);

  const bodyText = hasBody ? await request.clone().text() : undefined;

  const response = await fetch(target.toString(), {
    method: finalMethod,
    headers,
    body: hasBody ? bodyText : undefined,
  });

  const responseHeaders = jsonHeaders(response.headers);
  return new Response(response.body, { status: response.status, headers: responseHeaders });
}

async function handleDashboardRequest(request: Request, env: unknown): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: jsonHeaders() });
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: true, message: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders({ "content-type": "application/json; charset=utf-8" }),
    });
  }

  const url = new URL(request.url);
  const period = url.searchParams.get("period");
  const normalizedPeriod = period === "week" || period === "month" ? period : "day";

  // D-1 também usa 7 dias para manter comparações locais.
  // Semana: tenta 7 dias. Mês: tenta 30 dias. O n8n deve devolver apenas os dias existentes.
  const targetPath = normalizedPeriod === "month" ? "dashboard-data-month" : "dashboard-data-week";

  url.searchParams.set("period", normalizedPeriod);
  if (!url.searchParams.has("days")) {
    url.searchParams.set("days", normalizedPeriod === "month" ? "30" : "7");
  }

  const proxiedRequest = new Request(url.toString(), request);
  return proxyToN8n(proxiedRequest, env, targetPath, "GET");
}



function extractBotAnswer(payload: unknown): string | null {
  if (typeof payload === "string") return payload.trim() || null;
  if (!payload || typeof payload !== "object") return null;

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const answer = extractBotAnswer((item as Record<string, unknown>)?.json ?? item);
      if (answer) return answer;
    }
    return null;
  }

  const data = payload as Record<string, unknown>;
  for (const key of ["answer", "response", "text", "message", "output", "content", "data"] as const) {
    if (typeof data[key] === "string" && data[key].trim()) return data[key].trim();
  }

  if (data.json) {
    const answer = extractBotAnswer(data.json);
    if (answer) return answer;
  }

  if (data.body) {
    const answer = extractBotAnswer(data.body);
    if (answer) return answer;
  }

  if (typeof data.answer_fallback === "string" && data.answer_fallback.trim()) {
    return data.answer_fallback.trim();
  }

  return null;
}

async function proxyBotToN8n(request: Request, env: unknown): Promise<Response> {
  const target = `${getN8nBaseUrl(env)}/cag-bot-gemini-v2`;
  const bodyText = await request.clone().text();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 75000);

  try {
    const response = await fetch(target, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json,text/plain,*/*",
      },
      body: bodyText,
      signal: controller.signal,
    });

    const rawText = await response.text().catch(() => "");
    let payload: unknown = rawText;

    try {
      payload = rawText ? JSON.parse(rawText) : null;
    } catch {
      payload = rawText;
    }

    const answer = extractBotAnswer(payload);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: true,
          answer: answer || "O Assistente CAG retornou erro ao consultar o n8n.",
          status: response.status,
          detail: payload,
        }),
        { status: response.status, headers: jsonHeaders({ "content-type": "application/json; charset=utf-8" }) },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        answer: answer || "Recebi os dados, mas não encontrei uma resposta textual no retorno do bot.",
        raw: payload,
      }),
      { status: 200, headers: jsonHeaders({ "content-type": "application/json; charset=utf-8" }) },
    );
  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === "AbortError";
    return new Response(
      JSON.stringify({
        ok: false,
        error: true,
        answer: isAbort
          ? "A consulta ao Assistente CAG demorou mais que o esperado. Tente novamente."
          : "Não consegui consultar o Assistente CAG agora.",
        detail: error instanceof Error ? error.message : String(error),
      }),
      { status: isAbort ? 504 : 502, headers: jsonHeaders({ "content-type": "application/json; charset=utf-8" }) },
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function handleCagBotRequest(request: Request, env: unknown): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: jsonHeaders() });
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: true, message: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders({ "content-type": "application/json; charset=utf-8" }),
    });
  }

  return proxyBotToN8n(request, env);
}

async function handleSettingsRequest(request: Request, env: unknown): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: jsonHeaders() });
  if (!["GET", "POST"].includes(request.method)) {
    return new Response(JSON.stringify({ error: true, message: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders({ "content-type": "application/json; charset=utf-8" }),
    });
  }

  // Settings são salvas/lidas em cag:settings.
  // POST recebe tratamento explícito para garantir payload JSON limpo e validar persistência.
  if (request.method === "POST") return postSettingsToN8n(request, env);
  return proxyToN8n(request, env, "dashboard-settings", "GET");
}

async function handleUploadRequest(request: Request, env: unknown): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: jsonHeaders() });
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: true, message: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders({ "content-type": "application/json; charset=utf-8" }),
    });
  }

  // Workflow principal que recebe CSV e alimenta o Redis.
  return proxyToN8n(request, env, "dados-globo-vm22", "POST");
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

    if (url.pathname === "/api/dashboard") {
      return handleDashboardRequest(request, env);
    }

    if (url.pathname === "/api/dashboard/upload") {
      return handleUploadRequest(request, env);
    }

    if (url.pathname === "/api/settings") {
      return handleSettingsRequest(request, env);
    }

    if (url.pathname === "/api/cag-bot") {
      return handleCagBotRequest(request, env);
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
