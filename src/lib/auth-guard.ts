import { auth } from "./auth";
import { ForbiddenError, UnauthorizedError } from "./errors";
import { Permission, hasPermission } from "./permissions";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError("You must be signed in");
  return {
    id: session.user.id as string,
    email: session.user.email as string,
    role: (session.user as any).role as string,
  };
}

export async function requireRole(...roles: string[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new ForbiddenError("Insufficient permissions");
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
  return user;
}

export function getRequestInfo(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  };
}
