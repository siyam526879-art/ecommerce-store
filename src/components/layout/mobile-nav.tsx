"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

interface MobileNavProps {
  items: Array<{ href: string; label: string }>;
}

export function MobileNav({ items }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="ghost" size="icon" aria-label="Menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="z-[100] w-[min(320px,85vw)] overflow-y-auto bg-white px-6 pb-8 pt-6 shadow-2xl">
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <nav className="mt-8 flex flex-col gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-3 text-base font-medium text-gray-800 transition-colors hover:bg-orange-50 hover:text-[#f85606]"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-4 border-t border-gray-200 pt-4">
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-3 text-base font-medium text-gray-800 hover:bg-orange-50 hover:text-[#f85606]"
            >
              My Account
            </Link>
            <Link
              href="/account/orders"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-3 text-base font-medium text-gray-800 hover:bg-orange-50 hover:text-[#f85606]"
            >
              Orders
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

