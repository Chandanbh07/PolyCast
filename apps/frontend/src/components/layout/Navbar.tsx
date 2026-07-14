import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Wallet, LogOut, ChevronDown, Sun, Moon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { getBalance } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
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
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: balance } = useQuery({
    queryKey: queryKeys.balance,
    queryFn: getBalance,
    enabled: !!address,
  });

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-full glass px-3 pl-4 sm:px-4">
        <div className="flex items-center gap-8">
          <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
            <img
              src="/fav.png"
              alt="PolyCast"
              className="h-8 w-8 rounded-full object-contain"
            />
            <span className="font-display text-lg font-semibold tracking-tight text-mist-50">
              PolyCast
            </span>
          </NavLink>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-mist-50 bg-white/[0.10] shadow-[0_1px_0_rgba(255,255,255,0.08)_inset] dark:bg-white/[0.10] light:bg-black/[0.05]"
                      : "text-mist-400 hover:text-mist-100 hover:bg-white/[0.05]"
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:flex" />

          {address ? (
            <div className="relative hidden sm:block">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="glass-pill glass-hover flex items-center gap-2 rounded-full px-3.5 py-2.5"
              >
                <span className="font-mono-nums text-sm text-mist-50">{balanceToUsd(balance)}</span>
                <span className="h-4 w-px bg-white/10" />
                <span className="font-mono-nums text-xs text-mist-400">{truncateAddress(address)}</span>
                <ChevronDown className={cn("size-3.5 text-mist-400 transition-transform duration-200", menuOpen && "rotate-180")} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="glass absolute right-0 mt-2 w-48 rounded-2xl p-1.5"
                  >
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-mist-300 transition-colors hover:bg-white/[0.06] hover:text-no-400"
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
            className="md:hidden rounded-full p-2 text-mist-300 transition-colors hover:bg-white/[0.06]"
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
            className="md:hidden mx-auto mt-2 max-w-7xl overflow-hidden rounded-3xl glass"
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
                      "rounded-full px-3.5 py-2.5 text-sm font-medium",
                      isActive ? "text-mist-50 bg-white/[0.10]" : "text-mist-400"
                    )
                  }
                >
                  {l.label}
                </NavLink>
              ))}

              <button
                onClick={toggleTheme}
                className="flex items-center justify-between rounded-full px-3.5 py-2.5 text-sm font-medium text-mist-400 transition-colors hover:bg-white/[0.05] hover:text-mist-100"
              >
                <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>

              {address && (
                <div className="mt-2 flex items-center justify-between rounded-full border border-white/10 px-3.5 py-2.5">
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