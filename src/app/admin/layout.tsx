import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

export const metadata = { title: { default: "Admin", template: "%s | Admin" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Force dynamic + no-cache
  await headers();

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/admin");

  let role = ((session.user as any).role as string | undefined)?.toUpperCase();

  if (!role) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });
      role = dbUser?.role?.toUpperCase();
    } catch (e) {
      console.error("[ADMIN LAYOUT] DB role fetch failed:", e);
    }
  }

  if (role === "STAFF") redirect("/seller");
  if (role !== "ADMIN") redirect("/");

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}