import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { UnizenBackground } from "@/components/shared/UnizenBackground";

export function Layout() {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Animated unizen plasma — dark mode only, sits behind everything */}
      <UnizenBackground />

      <Navbar />
      <main className="flex-1 pt-20">
        <Outlet />
      </main>
      <footer className="border-t border-white/[0.06] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-mist-400">© {new Date().getFullYear()} PolyCast. Trade on outcomes, not opinions.</p>
          <p className="text-xs text-mist-400 font-mono-nums">Settled on-chain via Solana</p>
        </div>
      </footer>
    </div>
  );
}