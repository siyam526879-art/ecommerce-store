export type Permission =
  | "products.view" | "products.manage"
  | "categories.view" | "categories.manage"
  | "orders.view" | "orders.manage" | "orders.refund"
  | "customers.view" | "customers.manage"
  | "payments.view"
  | "coupons.view" | "coupons.manage"
  | "shipping.view" | "shipping.manage"
  | "returns.view" | "returns.manage"
  | "reports.view"
  | "staff.view" | "staff.manage"
  | "settings.view" | "settings.manage"
  | "audit.view";

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: [
    "products.view", "products.manage",
    "categories.view", "categories.manage",
    "orders.view", "orders.manage", "orders.refund",
    "customers.view", "customers.manage",
    "payments.view",
    "coupons.view", "coupons.manage",
    "shipping.view", "shipping.manage",
    "returns.view", "returns.manage",
    "reports.view",
    "staff.view", "staff.manage",
    "settings.view", "settings.manage",
    "audit.view",
  ],
  STAFF: [
    "products.view", "products.manage",
    "categories.view", "categories.manage",
    "orders.view", "orders.manage",
    "customers.view",
    "payments.view",
    "coupons.view", "coupons.manage",
    "shipping.view",
    "returns.view", "returns.manage",
    "reports.view",
  ],
};

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return perms.includes(permission);
}

export function requirePermission(role: string, permission: Permission) {
  if (!hasPermission(role, permission)) {
    throw new Error("FORBIDDEN");
  }
}