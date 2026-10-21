"use client";

import { usePathname } from "next/navigation";
import { Container } from "@/components/ui/container";
import { AccountNav } from "@/components/account/account-nav";

export function AccountLayoutShell({
  children,
  name,
}: {
  children: React.ReactNode;
  name: string;
}) {
  const pathname = usePathname();

  if (pathname === "/account") {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <main className="flex-1 bg-[#eff0f5] py-6">
      <Container>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
          <aside>
            <AccountNav name={name} />
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </Container>
    </main>
  );
}
