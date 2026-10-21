import { Container } from "@/components/ui/container";

export default function Loading() {
  return (
    <Container className="py-32 flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </Container>
  );
}