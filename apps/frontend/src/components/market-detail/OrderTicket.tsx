import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { placeOrder } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function OrderTicket({
  marketId,
  yesPrice,
  noPrice,
  yesQty,
  noQty,
  resolved,
}: {
  marketId: string;
  yesPrice: number;
  noPrice: number;
  yesQty: number;
  noQty: number;
  resolved: boolean;
}) {
  const { address, signIn, walletAvailable } = useAuth();
  const queryClient = useQueryClient();

  const [side, setSide] = useState<"yes" | "no">("yes");
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState(side === "yes" ? yesPrice : noPrice);
  const [qty, setQty] = useState(10);

  const heldQty = side === "yes" ? yesQty : noQty;
  const total = price * qty; // cents

  const mutation = useMutation({
    mutationFn: placeOrder,
    onSuccess: () => {
      toast.success("Order executed successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.market(marketId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.balance });
      queryClient.invalidateQueries({ queryKey: queryKeys.positions });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Order failed");
    },
  });

  function handleSideChange(next: "yes" | "no") {
    setSide(next);
    setPrice(next === "yes" ? yesPrice : noPrice);
  }

  function submit() {
    if (!address) return;
    if (!Number.isInteger(price) || price < 1 || price > 99) {
      toast.error("Price must be a whole number between 1 and 99¢");
      return;
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      toast.error("Quantity must be a positive whole number");
      return;
    }
    mutation.mutate({ marketId, side, type, price, qty });
  }

  if (resolved) {
    return (
      <div className="glass rounded-2xl p-5 text-center">
        <p className="text-sm text-mist-300">This market has resolved. Trading is closed.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5">
      <Tabs value={side} onValueChange={(v) => handleSideChange(v as "yes" | "no")}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="yes" className="data-[state=active]:!bg-yes-500/20 data-[state=active]:!text-yes-400">
            Buy Yes
          </TabsTrigger>
          <TabsTrigger value="no" className="data-[state=active]:!bg-no-500/20 data-[state=active]:!text-no-400">
            Buy No
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 flex gap-2">
        {(["buy", "sell"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cn(
              "flex-1 rounded-lg border py-1.5 text-sm font-medium capitalize transition-colors",
              type === t ? "border-signal-400 bg-signal-500/10 text-signal-300" : "border-ink-700 text-mist-400"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-mist-400">Price per share (¢)</label>
          <Input
            type="number"
            min={1}
            max={99}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-mist-400">Quantity (shares)</label>
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-ink-900/60 px-3 py-2.5 text-sm">
        <span className="text-mist-400">{type === "buy" ? "Total cost" : "Est. proceeds"}</span>
        <span className="font-mono-nums font-semibold text-mist-50">${(total / 100).toFixed(2)}</span>
      </div>

      {address && type === "sell" && (
        <p className="mt-2 text-xs text-mist-400">
          You hold <span className="font-mono-nums text-mist-200">{heldQty}</span> {side.toUpperCase()} shares
        </p>
      )}

      {!address ? (
        <Button className="mt-4 w-full" onClick={signIn} disabled={!walletAvailable}>
          {walletAvailable ? "Connect wallet to trade" : "Install a Solana wallet to trade"}
        </Button>
      ) : (
        <Button
          className="mt-4 w-full"
          variant={side === "yes" ? "yes" : "no"}
          onClick={submit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Placing order…" : `${type === "buy" ? "Buy" : "Sell"} ${side.toUpperCase()}`}
        </Button>
      )}
    </div>
  );
}
