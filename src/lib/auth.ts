import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";
import * as bcrypt from "bcryptjs";
import { prisma } from "./db";
import { loginSchema } from "./validators/auth.schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
    newUser: "/account", 
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        portal: { label: "Portal", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user || !user.passwordHash || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        if (
          credentials.portal === "staff" &&
          user.role !== "ADMIN" &&
          user.role !== "STAFF"
        ) {
          return null;
        }

        if (
          credentials.portal === "customer" &&
          (user.role === "ADMIN" || user.role === "STAFF")
        ) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase();
        if (!email) return false;

        const existingUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true, isActive: true, role: true },
        });

        if (existingUser) {
          if (!existingUser.isActive) {
            return "/auth/login?error=AccountDisabled";
          }

          // Google sign-in from the customer-facing flow must not admit staff/admin.
          if (existingUser.role === "ADMIN" || existingUser.role === "STAFF") {
            return false;
          }

          return true;
        }

        const cookieStore = await cookies();
        const intent = cookieStore.get("auth_intent")?.value;

        if (intent === "register") {
          return true; 
        }

        return true;
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      if (!token.role && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { role: true, id: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.id = dbUser.id;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        (session.user as { id?: string; role?: string }).id = token.id as string;
        (session.user as { id?: string; role?: string }).role = token.role as string;
      }
      return session;
    },
    
    async redirect({ url, baseUrl }) { if (url.startsWith("/")) return `${baseUrl}${url}`; if (new URL(url).origin === baseUrl) return url; return baseUrl; }
  },
});
