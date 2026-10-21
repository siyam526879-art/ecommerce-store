import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { AddressList } from "@/components/account/address-list";
import { AddAddress } from "@/components/account/add-address";

export const metadata = { title: "My Addresses" };

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/account/addresses");
  }

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { id: "desc" }],
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-3xl font-bold">My addresses</h1>
        <AddAddress
          defaultFullName={session.user.name ?? ""}
          defaultPhone=""
        />
      </div>
      <AddressList addresses={addresses} />
    </div>
  );
}