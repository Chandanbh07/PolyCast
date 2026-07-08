import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { onramp, offramp } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

export function RampDialog({ mode }: { mode: "onramp" | "offramp" }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(50);
  const queryClient = useQueryClient();
  const isOn = mode === "onramp";

  const mutation = useMutation({
    mutationFn: isOn ? onramp : offramp,
    onSuccess: (data) => {
      toast.success(`${isOn ? "Deposited" : "Withdrew"} $${data.amount.toFixed(2)}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.balance });
      setOpen(false);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? `${isOn ? "Deposit" : "Withdrawal"} failed`),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isOn ? "default" : "outline"}>
          {isOn ? <ArrowDownToLine className="size-4" /> : <ArrowUpFromLine className="size-4" />}
          {isOn ? "Deposit" : "Withdraw"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isOn ? "Deposit cash" : "Withdraw cash"}</DialogTitle>
          <DialogDescription>
            {isOn ? "Add USD to your trading balance." : "Withdraw USD from your trading balance."}
          </DialogDescription>
        </DialogHeader>
        <label className="mb-1.5 block text-xs font-medium text-mist-400">Amount ($)</label>
        <Input type="number" min={1} step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <Button
          className="mt-4 w-full"
          onClick={() => mutation.mutate({ amount })}
          disabled={mutation.isPending || amount <= 0}
        >
          {mutation.isPending ? "Processing…" : `Confirm ${isOn ? "deposit" : "withdrawal"}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
