import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PriceDisplayProps {
  price: number | string;
  compareAtPrice?: number | string | null;
  size?: "sm" | "md" | "lg";
}

export function PriceDisplay({ price, compareAtPrice, size = "md" }: PriceDisplayProps) {
  const p = Number(price);
  const ca = compareAtPrice ? Number(compareAtPrice) : null;
  const discount = ca && ca > p ? Math.round(((ca - p) / ca) * 100) : 0;

  const sizeClasses = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-3xl",
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`font-bold ${sizeClasses[size]}`}>{formatPrice(p)}</span>
      {ca && ca > p && (
        <>
          <span className="text-muted-foreground line-through">
            {formatPrice(ca)}
          </span>
          <Badge variant="destructive" className="text-xs">
            Save {discount}%
          </Badge>
        </>
      )}
    </div>
  );
}