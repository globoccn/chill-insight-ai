import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { LockKeyhole, LogIn, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginDemo, isAuthenticated } from "@/lib/auth";

function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loginDemo(username, password)) {
      setError("");
      return;
    }

    setError("Login ou senha inválidos.");
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 text-foreground">
      <div className="absolute inset-0 opacity-80 [background:radial-gradient(circle_at_20%_20%,rgba(0,210,150,0.16),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(70,130,255,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-card/90 p-7 shadow-2xl backdrop-blur-xl">
        <div className="mb-7 flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-efficiency/15 text-efficiency shadow-[0_0_26px_rgba(0,210,150,0.22)]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-efficiency">Acesso restrito</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Building ESG Performance</h1>
            <p className="mt-1 text-sm text-muted-foreground">Entre para acessar a dashboard CAG e o Assistente IA.</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Login</span>
            <Input
              autoFocus
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
              className="mt-1.5 h-11 rounded-xl bg-background/60"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Senha</span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="mt-1.5 h-11 rounded-xl bg-background/60"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-critical/30 bg-critical/10 px-3 py-2 text-sm text-critical">
              {error}
            </div>
          )}

          <Button type="submit" className="h-11 w-full rounded-xl bg-efficiency text-background hover:bg-efficiency/90">
            <LogIn className="mr-2 h-4 w-4" />
            Entrar
          </Button>
        </form>

        <div className="mt-6 rounded-2xl border border-border bg-background/50 p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground">
            <LockKeyhole className="h-3.5 w-3.5 text-efficiency" />
            Demonstração protegida por senha
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-warning" />
            Os webhooks só são chamados depois do login.
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const sync = () => {
      setAuthenticated(isAuthenticated());
      setReady(true);
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("cag-auth-change", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("cag-auth-change", sync);
    };
  }, []);

  if (!ready) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!authenticated) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
