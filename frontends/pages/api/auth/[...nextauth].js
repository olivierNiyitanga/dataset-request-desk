import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        const apiBaseUrl =
          process.env.BACKEND_INTERNAL_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          (process.env.NODE_ENV === "development" ? "http://localhost:8000" : undefined);

        if (!email || !password) {
          throw new Error("Email and password are required");
        }
        if (!apiBaseUrl) {
          throw new Error("Backend API URL is not configured");
        }

        try {
          const response = await axios.post(
            `${apiBaseUrl.replace(/\/$/, "")}/api/auth/login`,
            { email, password },
            { timeout: 15000 }
          );

          const { access_token: accessToken, user } = response.data || {};
          if (!accessToken || !user?.id || !user?.email || !user?.role) {
            throw new Error("Invalid authentication response from backend");
          }

          return {
            id: String(user.id),
            email: user.email,
            name: user.name || user.email,
            organisation: user.organisation || null,
            role: user.role,
            accessToken,
          };
        } catch (error) {
          if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
              throw new Error("Invalid email or password");
            }
            if (error.response?.status === 422) {
              throw new Error("Invalid login details");
            }
            if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
              throw new Error("Authentication service is unavailable");
            }
          }
          throw new Error(error.message || "Authentication failed");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.organisation = user.organisation;
        token.role = user.role;
        token.accessToken = user.accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        name: token.name,
        organisation: token.organisation,
        role: token.role,
        token: token.accessToken,
      };
      return session;
    },
  },
  pages: {
    signIn: "/auth",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default function auth(req, res) {
  return NextAuth(req, res, authOptions);
}
