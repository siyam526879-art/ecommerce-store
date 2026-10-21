import { auth } from "@/lib/auth";
import { Container } from "@/components/ui/container";
import { StatusBadge } from "@/components/layout/status-badge";

export async function AdminHeader() {
  const session = await auth();
  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <div className="px-6 h-14 flex items-center justify-between">
        <div />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">{session?.user?.name ?? session?.user?.email}</p>
            <StatusBadge status={(session?.user as any)?.role ?? "CUSTOMER"} />
          </div>
        </div>
      </div>
    </header>
  );
}