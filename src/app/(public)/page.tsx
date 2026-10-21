import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/home");
  }

  const role = (session.user as { role?: string }).role;

  if (role === "ADMIN" || role === "STAFF") {
    // Preserve existing staff/admin root behavior.
    redirect(role === "ADMIN" ? "/admin" : "/seller");
  }

  redirect("/account");
}
