import { bookLevels } from "@/lib/orderbook";
import type { Orderbook } from "@/lib/types";
import { cn } from "@/lib/utils";

function Side({ book, side }: { book: Orderbook; side: "yes" | "no" }) {
  const levels = bookLevels(book).slice(0, 6);
  const maxQty = Math.max(1, ...levels.map((l) => l.qty));
  const accent = side === "yes" ? "yes" : "no";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-mist-400">
        <span>Price</span>
        <span>Qty available</span>
      </div>
      {levels.length === 0 ? (
        <p className="py-6 text-center text-sm text-mist-400">No resting {side} asks</p>
      ) : (
        <div className="space-y-1">
          {levels.map((l) => (
            <div key={l.price} className="relative overflow-hidden rounded-lg">
              <div
                className={cn(
                  "absolute inset-y-0 left-0",
                  accent === "yes" ? "bg-yes-500/10" : "bg-no-500/10"
                )}
                style={{ width: `${(l.qty / maxQty) * 100}%` }}
              />
              <div className="relative flex items-center justify-between px-2.5 py-1.5">
                <span className={cn("font-mono-nums text-sm font-medium", accent === "yes" ? "text-yes-400" : "text-no-400")}>
                  {l.price}¢
                </span>
                <span className="font-mono-nums text-sm text-mist-300">{l.qty}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrderbookView({ yesBook, noBook }: { yesBook: Orderbook; noBook: Orderbook }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <Side book={yesBook} side="yes" />
      <Side book={noBook} side="no" />
    </div>
  );
}
