import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SellerSidebar } from "@/components/seller/seller-sidebar";

export const metadata = { title: "Seller Dashboard" };

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/seller");

  const role = (session.user as any).role;

  // ✅ ONLY STAFF can access /seller
  // ADMIN → /admin, others → /
  if (role === "ADMIN") redirect("/admin");
  if (role !== "STAFF") redirect("/");

  return (
    <div className="flex min-h-screen bg-muted/30">
      <SellerSidebar />
      <div className="flex-1 min-w-0">
        <header className="h-14 border-b bg-background flex items-center justify-between px-6">
          <p className="text-sm font-medium">
            Welcome, {session.user.name ?? session.user.email}
          </p>
          <span className="text-xs px-2 py-1 rounded bg-muted">{role}</span>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}