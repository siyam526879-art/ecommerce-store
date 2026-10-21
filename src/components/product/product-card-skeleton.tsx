import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border bg-muted overflow-hidden">
        <AspectRatio ratio={1}>
          <Skeleton className="h-full w-full" />
        </AspectRatio>
      </div>
      <div className="flex flex-col gap-2 px-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}