import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import Database from "./database";
import { User } from "./types";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const db = new Database();
        try {
          const user = await db.get(
            "SELECT id, username, email, firstname, lastname, password_hash, role, favorite_team_id, favorite_player_id, created_at, updated_at FROM users WHERE username = ?",
            [credentials.username]
          ) as User | undefined;

          if (!user) {
            return null;
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.password_hash
          );

          if (!isValidPassword) {
            return null;
          }

          return {
            id: user.id.toString(),
            username: user.username,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            role: user.role,
            favorite_team_id: user.favorite_team_id,
            favorite_player_id: user.favorite_player_id,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        } finally {
          db.close();
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.username = user.username;
        token.firstname = user.firstname;
        token.lastname = user.lastname;
        token.favorite_team_id = user.favorite_team_id;
        token.favorite_player_id = user.favorite_player_id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.username = token.username as string;
        session.user.firstname = token.firstname as string;
        session.user.lastname = token.lastname as string;
        session.user.favorite_team_id = token.favorite_team_id as number;
        session.user.favorite_player_id = token.favorite_player_id as number;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET || "development-secret-key",
};

export const hasPermission = (userRole: string, requiredRole: string): boolean => {
  const roleHierarchy = {
    admin: 3,
    manager: 2,
    user: 1,
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
};

export const canCreate = (userRole: string): boolean => {
  return hasPermission(userRole, 'user');
};

export const canModify = (userRole: string): boolean => {
  return hasPermission(userRole, 'manager');
};

export const canManageUsers = (userRole: string): boolean => {
  return hasPermission(userRole, 'admin');
};