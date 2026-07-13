import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Wallet, LogOut, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getBalance } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { balanceToUsd, truncateAddress, cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Home" },
  { to: "/markets", label: "Markets" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/orders", label: "Activity" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/profile", label: "Profile" },
];

export function Navbar() {
  const { address, signIn, signOut, walletAvailable, connecting } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: balance } = useQuery({
    queryKey: queryKeys.balance,
    queryFn: getBalance,
    enabled: !!address,
  });

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <span className="flex size-8 items-center justify-center rounded-lg bg-signal-500 shadow-glow-signal font-display text-sm font-bold text-ink-950">
              P
            </span>
            <img
              src="/logo.png"
              alt="PolyCast"
              className="h-8 w-8 rounded-lg object-contain"
            />
          </NavLink>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "text-mist-50 bg-ink-800" : "text-mist-400 hover:text-mist-100 hover:bg-ink-800/60"
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {address ? (
            <div className="relative hidden sm:block">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="glass-hover flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-900/60 px-3 py-2"
              >
                <span className="font-mono-nums text-sm text-mist-50">{balanceToUsd(balance)}</span>
                <span className="h-4 w-px bg-ink-600" />
                <span className="font-mono-nums text-xs text-mist-400">{truncateAddress(address)}</span>
                <ChevronDown className="size-3.5 text-mist-400" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="glass absolute right-0 mt-2 w-48 rounded-xl p-1.5"
                  >
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-mist-300 hover:bg-ink-800 hover:text-no-400"
                    >
                      <LogOut className="size-4" /> Disconnect
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={signIn}
              disabled={!walletAvailable || connecting}
              title={!walletAvailable ? "Install the Solflare wallet extension to connect" : undefined}
            >
              <Wallet className="size-4" />
              {connecting ? "Connecting…" : walletAvailable ? "Connect Wallet" : "No Wallet Found"}
            </Button>
          )}

          <button
            className="md:hidden rounded-lg p-2 text-mist-300 hover:bg-ink-800"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-ink-800 bg-ink-950/95"
          >
            <div className="flex flex-col gap-1 p-3">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "rounded-lg px-3 py-2.5 text-sm font-medium",
                      isActive ? "text-mist-50 bg-ink-800" : "text-mist-400"
                    )
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              {address && (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-ink-700 px-3 py-2.5">
                  <span className="font-mono-nums text-sm text-mist-50">{balanceToUsd(balance)}</span>
                  <button onClick={signOut} className="text-xs text-no-400">Disconnect</button>
                </div>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
