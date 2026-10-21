"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, FolderTree, ShoppingCart, Users, Wallet,
  Tag, Truck, RotateCcw, BarChart3, UserCog, Settings, ScrollText, LogOut, Store,
  Sparkles,} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/auth/sign-out-button";

const sections = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard" }],
  },
  {
    title: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: Package, perm: "products.view" },
      { href: "/admin/categories", label: "Categories", icon: FolderTree, perm: "categories.view" },
      { href: "/admin/sub-categories", label: "Sub Categories", icon: FolderTree, perm: "categories.view" },
    { href: "/admin/sub-category-products", label: "Sub Category Products", icon: FolderTree, perm: "categories.view" },
      { href: "/admin/inventory", label: "Inventory", icon: Package, perm: "products.view" },
    ],
  },
  {
    title: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart, perm: "orders.view" },
      { href: "/admin/customers", label: "Customers", icon: Users, perm: "customers.view" },
      { href: "/admin/payments", label: "Payments", icon: Wallet, perm: "payments.view" },
      { href: "/admin/returns", label: "Return & Refund", icon: RotateCcw, perm: "returns.view" },
    ],
  },
  {
    title: "Marketing",
    items: [
      { href: "/admin/coupons", label: "Coupons", icon: Tag, perm: "coupons.view" },
      { href: "/admin/shipping", label: "Shipping", icon: Truck, perm: "shipping.view" },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3, perm: "reports.view" },
      { href: "/admin/ai-manager", label: "AI Manager", icon: Sparkles, perm: "reports.view" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/staff", label: "Staff", icon: UserCog, perm: "staff.view" },
      { href: "/admin/settings", label: "Settings", icon: Settings, perm: "settings.view" },
      { href: "/admin/audit-log", label: "Audit log", icon: ScrollText, perm: "audit.view" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-background flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <Store className="h-5 w-5" />
          Admin Panel
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                      active
                        ? "bg-primary text-primary-foreground font-medium"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t space-y-1">
        <Link
          href="/"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted"
        >
          <Store className="h-4 w-4" /> View store
        </Link>
        <SignOutButton
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm w-full text-left hover:bg-muted text-destructive transition-colors"
          iconClassName="h-4 w-4"
        />
      </div>
    </aside>
  );
}


