import { Container } from "@/components/ui/container";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12">
      <Container size="sm">{children}</Container>
    </div>
  );
}