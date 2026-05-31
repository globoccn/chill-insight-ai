import type { DashboardPeriod } from "@/lib/period";

export const REPORT_DOWNLOAD_URL = import.meta.env.VITE_REPORT_DOWNLOAD_URL || "/api/report";

export const reportPeriodLabels: Record<DashboardPeriod, string> = {
  day: "diário",
  week: "semanal",
  month: "mensal",
};

export const reportFilePrefixes: Record<DashboardPeriod, string> = {
  day: "relatorio-cag-diario",
  week: "relatorio-cag-semanal",
  month: "relatorio-cag-mensal",
};

export function isoDateOnly(value?: string | null) {
  if (!value) return null;

  const native = new Date(value);
  if (!Number.isNaN(native.getTime())) {
    const yyyy = native.getFullYear();
    const mm = String(native.getMonth() + 1).padStart(2, "0");
    const dd = String(native.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;

  return null;
}

export function buildReportFilename(period: DashboardPeriod, date?: string | null) {
  return `${reportFilePrefixes[period]}${date ? `-${date}` : ""}.pdf`;
}

function filenameFromContentDisposition(header: string | null) {
  if (!header) return null;

  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) return decodeURIComponent(utf8[1].replace(/["']/g, ""));

  const basic = header.match(/filename="?([^";]+)"?/i);
  return basic?.[1] || null;
}

export async function downloadReportPdf(period: DashboardPeriod, date?: string | null) {
  const url = new URL(REPORT_DOWNLOAD_URL, window.location.origin);
  url.searchParams.set("period", period);
  if (date) url.searchParams.set("date", date);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { accept: "application/pdf" },
  });

  if (!response.ok) {
    let message = "Não foi possível gerar o relatório agora.";
    try {
      const payload = await response.json();
      message = String(payload.message || payload.error || message);
    } catch {
      const text = await response.text().catch(() => "");
      if (text) message = text;
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const filename = filenameFromContentDisposition(response.headers.get("content-disposition")) || buildReportFilename(period, date);

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
