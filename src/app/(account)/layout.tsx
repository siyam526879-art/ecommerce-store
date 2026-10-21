import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AccountLayoutShell } from "@/components/account/account-layout-shell";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const role = (session.user as { role?: string }).role;

  if (role === "ADMIN") redirect("/admin");
  if (role === "STAFF") redirect("/seller");

  const name = (session.user.name || session.user.email || "there")
    .split(/[\s@]/)[0];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <AccountLayoutShell name={name}>{children}</AccountLayoutShell>
      <Footer />
    </div>
  );
}
