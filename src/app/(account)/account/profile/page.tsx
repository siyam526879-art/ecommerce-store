import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { EditableField } from "@/components/account/editable-field";
import { ChangePassword } from "@/components/account/change-password";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/account/profile");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });

  if (!user) redirect("/auth/login");

  const roleLabel = user.role.charAt(0) + user.role.slice(1).toLowerCase();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Profile</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Manage your account information.
      </p>

      <div
        className="rounded-lg border bg-card"
        style={{ maxWidth: "420px", width: "100%" }}
      >
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-sm">Account information</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Hover a field then click pencil to edit.
          </p>
        </div>

        <div className="px-4">
          <EditableField
            label="Name"
            value={user.name ?? ""}
            field="name"
            placeholder="Your name"
          />
          <EditableField
            label="Email"
            value={user.email}
            field="email"
            type="email"
            placeholder="you@example.com"
          />
          <EditableField
            label="Phone"
            value={user.phone ?? ""}
            field="phone"
            placeholder="+880..."
          />
        </div>

        <div className="border-t px-4 py-3">
          <ChangePassword />
        </div>

        <div className="border-t px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
            Role
          </div>
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
            {roleLabel}
          </span>
        </div>
      </div>
    </div>
  );
}