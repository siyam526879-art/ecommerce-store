import { redirect } from "next/navigation";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  // Reuse shop page with q param
  redirect(`/shop${params.q ? `?q=${encodeURIComponent(params.q)}` : ""}`);
}