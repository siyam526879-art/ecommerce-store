import { redirect } from "next/navigation";

export default async function CategoryRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect("/shop?category=" + encodeURIComponent(slug));
}