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

  const headers = new Headers(request.headers);
  headers.delete("host");

  const finalMethod = method ?? request.method;
  const hasBody = !["GET", "HEAD"].includes(finalMethod.toUpperCase());

  const response = await fetch(target.toString(), {
    method: finalMethod,
    headers,
    body: hasBody ? request.body : undefined,
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

  // Dados consolidados já gravados pelo n8n no Redis: cag:dashboard:latest.
  return proxyToN8n(request, env, "dashboard-data", "GET");
}

async function handleSettingsRequest(request: Request, env: unknown): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: jsonHeaders() });
  if (!["GET", "POST"].includes(request.method)) {
    return new Response(JSON.stringify({ error: true, message: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders({ "content-type": "application/json; charset=utf-8" }),
    });
  }

  // Settings são salvas/lidas pelo n8n em cag:settings.
  return proxyToN8n(request, env, "dashboard-settings", request.method);
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
