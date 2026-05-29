import { type FormEvent, useMemo, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const RAW_AI_AGENT_URL = import.meta.env.VITE_AI_AGENT_URL || "/api/cag-bot";

// Para evitar CORS com o webhook do n8n no navegador, o chat usa sempre o proxy
// server-side da própria dashboard quando a variável aponta para uma URL externa.
const AI_AGENT_URL =
  typeof RAW_AI_AGENT_URL === "string" && RAW_AI_AGENT_URL.startsWith("/")
    ? RAW_AI_AGENT_URL
    : "/api/cag-bot";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const quickQuestions = [
  "Qual foi o consumo da semana?",
  "Qual foi o pico de demanda?",
  "Como ficou a eficiência?",
  "Quanto economizamos versus baseline?",
  "Qual chiller merece atenção?",
  "Qual era o kW às 14:15 no dia 20/05?",
];

function extractAnswer(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;

  if (typeof data.answer === "string") return data.answer;
  if (typeof data.response === "string") return data.response;
  if (typeof data.text === "string") return data.text;
  if (typeof data.message === "string") return data.message;

  if (Array.isArray(data)) {
    const first = data[0] as Record<string, unknown> | undefined;
    return extractAnswer(first?.json ?? first);
  }

  if (data.json) return extractAnswer(data.json);
  if (data.body) return extractAnswer(data.body);

  return null;
}

function newMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
  };
}

export function AiAgent() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    newMessage("assistant", "Olá! Sou o Assistente CAG. Pergunte sobre consumo, eficiência, chillers, ESG, economia ou um horário específico."),
  ]);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const canSend = useMemo(() => question.trim().length > 0 && !isLoading, [question, isLoading]);

  async function sendQuestion(text = question) {
    const cleanQuestion = text.trim();
    if (!cleanQuestion || isLoading) return;

    setOpen(true);
    setQuestion("");
    setMessages((current) => [...current, newMessage("user", cleanQuestion)]);
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 75000);

      const response = await fetch(AI_AGENT_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ question: cleanQuestion }),
        signal: controller.signal,
      }).finally(() => window.clearTimeout(timeout));

      const rawText = await response.text();
      let payload: unknown = null;

      try {
        payload = rawText ? JSON.parse(rawText) : null;
      } catch {
        payload = rawText;
      }

      if (!response.ok) {
        throw new Error(typeof payload === "string" ? payload : `Erro ${response.status} ao consultar o assistente.`);
      }

      const answer = typeof payload === "string" ? payload : extractAnswer(payload);

      setMessages((current) => [
        ...current,
        newMessage("assistant", answer || "Recebi os dados, mas não encontrei uma resposta textual no retorno do bot."),
      ]);
    } catch (error) {
      const message = error instanceof DOMException && error.name === "AbortError"
        ? "A consulta demorou mais que o esperado. Tente novamente em alguns instantes."
        : error instanceof Error
          ? error.message
          : "Tente novamente.";

      setMessages((current) => [
        ...current,
        newMessage("assistant", `Não consegui consultar o Assistente CAG agora. ${message}`),
      ]);
    } finally {
      setIsLoading(false);
      requestAnimationFrame(() => textAreaRef.current?.focus());
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendQuestion();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="fixed bottom-5 right-5 z-40 h-12 rounded-full bg-efficiency px-5 text-background shadow-[0_16px_40px_rgba(0,210,150,0.28)] hover:bg-efficiency/90">
          <Bot className="mr-2 h-5 w-5" />
          Assistente CAG
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-[92vw] flex-col border-border bg-background p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-3 pr-8">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-efficiency/15 text-efficiency">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle>Assistente Inteligente CAG</SheetTitle>
              <SheetDescription>Consulte consumo, eficiência, chillers, ESG e pontos de 15 minutos.</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="border-b border-border px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => void sendQuestion(item)}
                disabled={isLoading}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-efficiency/40 hover:text-foreground disabled:opacity-60"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.map((message) => (
            <div key={message.id} className={cn("flex gap-2", message.role === "user" ? "justify-end" : "justify-start")}>
              {message.role === "assistant" && (
                <div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-efficiency/15 text-efficiency">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  message.role === "user"
                    ? "bg-efficiency text-background"
                    : "border border-border bg-card text-foreground",
                )}
              >
                {message.content}
              </div>
              {message.role === "user" && (
                <div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-card text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-efficiency" />
              Analisando dados do CAG...
            </div>
          )}
        </div>

        <form className="border-t border-border p-4" onSubmit={onSubmit}>
          <div className="rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-efficiency/50">
            <Textarea
              ref={textAreaRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendQuestion();
                }
              }}
              placeholder="Ex.: Qual era o kW às 14:15 no dia 20/05?"
              className="min-h-[78px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <div className="flex items-center justify-between gap-2 px-1 pb-1">
              <span className="text-[11px] text-muted-foreground">Enter envia · Shift+Enter quebra linha</span>
              <Button type="submit" size="sm" disabled={!canSend} className="rounded-xl bg-efficiency text-background hover:bg-efficiency/90">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Enviar
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
