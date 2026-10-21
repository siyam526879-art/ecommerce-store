import { cookies } from "next/headers";
import { PageTitle } from "@/components/admin/page-title";
import { AuditLogClient } from "./audit-log-client";

export const metadata = { title: "Audit Log" };

export default async function AuditLogPage() {
  const cookieStore = await cookies();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/admin/audit-log?pageSize=100`,
    {
      cache: "no-store",
      headers: { cookie: cookieStore.toString() },
    }
  );

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  const logs = data?.data ?? [];
  const total = data?.pagination?.total ?? logs.length ?? 0;

  return (
    <div>
      <PageTitle
        title="Audit Log"
        description={`${total} activity records`}
      />
      <AuditLogClient initial={logs} />
    </div>
  );
}