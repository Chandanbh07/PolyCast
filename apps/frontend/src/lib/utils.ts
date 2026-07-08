import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Cents (0-100 integer "price") -> dollars string, e.g. 65 -> "$0.65" */
export function centsToPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Cents (0-100 integer "price") -> percentage string, e.g. 65 -> "65%" */
export function centsToPercent(cents: number): string {
  return `${Math.round(cents)}%`;
}

/** usdBalance is stored in integer cents on the backend (see /onramp, /offramp) */
export function balanceToUsd(balanceCents: number | undefined | null): string {
  if (balanceCents === undefined || balanceCents === null) return "$0.00";
  return (balanceCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function truncateAddress(address?: string | null, chars = 4): string {
  if (!address) return "—";
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
