"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string };
const GROUPS: { title: string; href: string; items: Item[] }[] = [
  {
    title: "Manage My Account",
    href: "/account",
    items: [
      { href: "/account/profile", label: "My Profile" },
      { href: "/account/addresses", label: "Address Book" },
    ],
  },
  {
    title: "My Orders",
    href: "/account/orders",
    items: [
      { href: "/account/returns", label: "My Returns" },
      { href: "/account/cancellations", label: "My Cancellations" },
    ],
  },
  { title: "My Reviews", href: "/account/reviews", items: [] },
  { title: "My Wishlist", href: "/account/wishlist", items: [] },
];

export function AccountNav({ name }: { name: string }) {
  const path = usePathname();
  const on = (h: string) => path === h;

  return (
    <nav className="space-y-5 text-sm">
      <p className="text-gray-700">Hello, {name}</p>
      {GROUPS.map((g) => (
        <div key={g.title} className="space-y-2">
          <Link href={g.href} className={"block text-base font-semibold " + (on(g.href) ? "text-[#1a9cb7]" : "text-gray-800 hover:text-[#f85606]")}>
            {g.title}
          </Link>
          {g.items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={"ml-5 block " + (on(i.href) ? "font-semibold text-[#f85606]" : "text-gray-500 hover:text-[#f85606]")}
            >
              {i.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}