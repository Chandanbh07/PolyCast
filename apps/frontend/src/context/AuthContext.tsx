import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  claims: any | null;
  address: string | null;
  loading: boolean;
  walletAvailable: boolean;
  connecting: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Mirrors the original signin flow in apps/frontend/src/App.tsx and
// apps/backend/middleware.ts, which reads user.user_metadata.custom_claims.address.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [claims, setClaims] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function updateClaims() {
      const result = await supabase.auth.getClaims();
      if (!mounted) return;
      setClaims(result.data ? result.data.claims : null);
      setLoading(false);
    }

    updateClaims();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      await updateClaims();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const address: string | null = claims?.user_metadata?.custom_claims?.address ?? null;
  const walletAvailable = typeof window !== "undefined" && !!window.solflare;

  async function signIn() {
    if (!window.solflare) return;
    setConnecting(true);
    try {
      await supabase.auth.signInWithWeb3({
        chain: "solana",
        statement: "I confirm I want to signin to prediction market",
        wallet: window.solflare,
      });
    } finally {
      setConnecting(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ claims, address, loading, walletAvailable, connecting, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
