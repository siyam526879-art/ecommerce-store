import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  PROCESSING: "bg-indigo-100 text-indigo-800 border-indigo-200",
  SHIPPED: "bg-purple-100 text-purple-800 border-purple-200",
  DELIVERED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  REFUNDED: "bg-gray-100 text-gray-800 border-gray-200",
  REQUESTED: "bg-orange-100 text-orange-800 border-orange-200",
  APPROVED: "bg-blue-100 text-blue-800 border-blue-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  SUCCEEDED: "bg-green-100 text-green-800 border-green-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
  ARCHIVED: "bg-gray-100 text-gray-800 border-gray-200",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const style = statusStyles[status] ?? "bg-gray-100 text-gray-800 border-gray-200";
  return (
    <Badge variant="outline" className={cn(style, "capitalize", className)}>
      {status.replace(/_/g, " ").toLowerCase()}
    </Badge>
  );
}