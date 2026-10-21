import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CURRENCY } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Bengali Taka sign, expressed as Unicode escape to avoid encoding issues
const TAKA = "\u09F3";

export function formatPrice(amount: number): string {
  const n = Number(amount);
  if (!isFinite(n)) return TAKA + "0";
  const hasDecimals = Math.abs(n % 1) > 0.001;
  const formatted = n.toLocaleString("en-IN", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return TAKA + formatted;
}

export function cleanProductName(name: string): string {
  if (typeof name !== "string") return "";
  return name
    .replace(/[^\x20-\x7E\u0980-\u09FF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `ORD-${date}-${rand}`;
}