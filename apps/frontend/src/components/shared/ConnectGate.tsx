import { Wallet } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export function ConnectGate({ label }: { label: string }) {
  const { signIn, walletAvailable, connecting } = useAuth();
  return (
    <div className="glass mx-auto mt-10 flex max-w-md flex-col items-center gap-4 rounded-3xl p-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-signal-500/12 text-signal-300 ring-1 ring-signal-500/20">
        <Wallet className="size-6" />
      </span>
      <h2 className="font-display text-xl font-semibold text-mist-50 tracking-[-0.02em]">Connect your wallet</h2>
      <p className="text-sm text-mist-300 leading-relaxed">Connect a Solana wallet to view your {label}.</p>
      <Button onClick={signIn} disabled={!walletAvailable || connecting} className="mt-2">
        {connecting ? "Connecting…" : walletAvailable ? "Connect Wallet" : "No wallet found"}
      </Button>
    </div>
  );
}