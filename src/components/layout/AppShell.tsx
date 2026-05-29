import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ThemeProvider } from "@/lib/theme";
import { AiAgent } from "@/components/ai/AiAgent";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 px-5 py-4 space-y-4">{children}</main>
        </div>
        <AiAgent />
      </div>
    </ThemeProvider>
  );
}
