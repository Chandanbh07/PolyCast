import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { getBalance } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import { balanceToUsd } from "@/lib/utils";
import { ConnectGate } from "@/components/shared/ConnectGate";
import { RampDialog } from "@/components/profile/RampDialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function Profile() {
  const { address, signOut } = useAuth();
  const { data: balance, isLoading } = useQuery({
    queryKey: queryKeys.balance,
    queryFn: getBalance,
    enabled: !!address,
  });

  if (!address) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold text-mist-50">Profile</h1>
        <ConnectGate label="profile" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-mist-50">Profile</h1>

      <div className="glass mt-6 rounded-2xl p-6">
        <p className="text-xs text-mist-400">Wallet address</p>
        <div className="mt-1.5 flex items-center gap-2">
          <p className="font-mono-nums break-all text-sm text-mist-100">{address}</p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(address);
              toast.success("Address copied");
            }}
            className="shrink-0 rounded-md p-1.5 text-mist-400 hover:bg-ink-800 hover:text-mist-100"
          >
            <Copy className="size-3.5" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-xl bg-ink-900/60 p-4">
          <div>
            <p className="text-xs text-mist-400">Cash balance</p>
            {isLoading ? (
              <Skeleton className="mt-1.5 h-7 w-24" />
            ) : (
              <p className="font-mono-nums text-2xl font-semibold text-mist-50">{balanceToUsd(balance)}</p>
            )}
          </div>
          <div className="flex gap-2">
            <RampDialog mode="onramp" />
            <RampDialog mode="offramp" />
          </div>
        </div>

        <button
          onClick={signOut}
          className="mt-6 text-sm font-medium text-no-400 hover:text-no-300"
        >
          Disconnect wallet
        </button>
      </div>
    </div>
  );
}
