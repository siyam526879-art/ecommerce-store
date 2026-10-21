export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Store";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const CURRENCY = {
  code: "BDT",
  symbol: "\u09F3",
  locale: "en-BD",
  stripe: "usd", // Stripe uses lowercase
} as const;

export const PAGINATION = {
  defaultPageSize: 24,
  maxPageSize: 100,
} as const;

export const ORDER_STATUS = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export const PAYMENT_STATUS = [
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;

export const PRODUCT_STATUS = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

// Stock reservation timeout (milliseconds)
export const STOCK_RESERVATION_TIMEOUT = 30 * 60 * 1000; // 30 minutes