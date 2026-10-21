import { cn } from "@/lib/utils";

interface PageTitleProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageTitle({ title, description, actions, className }: PageTitleProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6 flex-wrap", className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}