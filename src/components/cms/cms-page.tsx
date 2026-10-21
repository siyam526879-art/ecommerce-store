import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";

interface CmsPageProps {
  slug: string;
  title: string;
}

export async function CmsPage({ slug, title }: CmsPageProps) {
  const page = await prisma.cmsPage.findUnique({ where: { slug } });
  if (!page) notFound();

  return (
    <>
      <PageHeader title={page.title || title} breadcrumbs={[{ label: page.title || title }]} />
      <Container className="py-12 max-w-3xl">
        <div
          className="prose prose-neutral max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </Container>
    </>
  );
}