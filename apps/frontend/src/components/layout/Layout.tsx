import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-ink-800/80 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-mist-400">© {new Date().getFullYear()} PolyCast. Trade on outcomes, not opinions.</p>
          <p className="text-xs text-mist-400 font-mono-nums">Settled on-chain via Solana</p>
        </div>
      </footer>
    </div>
  );
}
