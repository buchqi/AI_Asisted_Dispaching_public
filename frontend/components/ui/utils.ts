import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Combines conditional class names and removes conflicting Tailwind classes.
// This keeps component styling clean when variants are added.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Shared currency formatter for rates and negotiation numbers.
export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

// Shared number formatter for miles, weight, counters, and table values.
export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
