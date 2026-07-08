import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Split, Merge } from "lucide-react";
import { splitPosition, mergePosition } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SplitMergeCard({ marketId }: { marketId: string }) {
  const { address } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(10);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeys.balance });
    queryClient.invalidateQueries({ queryKey: queryKeys.positions });
    queryClient.invalidateQueries({ queryKey: queryKeys.market(marketId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.history });
  }

  const split = useMutation({
    mutationFn: splitPosition,
    onSuccess: () => {
      toast.success("Split complete — received Yes & No shares");
      invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Split failed"),
  });

  const merge = useMutation({
    mutationFn: mergePosition,
    onSuccess: () => {
      toast.success("Merge complete — redeemed $" + amount.toFixed(2));
      invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Merge failed"),
  });

  if (!address) return null;

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="font-display text-sm font-semibold text-mist-50">Split &amp; Merge</h3>
      <p className="mt-1 text-xs text-mist-400">
        Split turns $ into an equal number of Yes and No shares. Merge redeems an equal number of
        both back into $.
      </p>
      <div className="mt-3">
        <label className="mb-1.5 block text-xs font-medium text-mist-400">Amount</label>
        <Input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="subtle"
          onClick={() => split.mutate({ marketId, amount })}
          disabled={split.isPending}
        >
          <Split className="size-4" /> Split
        </Button>
        <Button
          variant="subtle"
          onClick={() => merge.mutate({ marketId, amount })}
          disabled={merge.isPending}
        >
          <Merge className="size-4" /> Merge
        </Button>
      </div>
    </div>
  );
}
