import { Container } from "@/components/ui/container";
import { Breadcrumbs, BreadcrumbEntry } from "./breadcrumbs";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbEntry[];
}

export function PageHeader({ title, description, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="border-b bg-muted/30">
      <Container className="py-8">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <h1 className="text-3xl md:text-4xl font-bold mt-4">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-2">{description}</p>
        )}
      </Container>
    </div>
  );
}