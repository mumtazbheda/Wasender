import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { sql } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/spreadsheets",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        // Persist refresh token to DB so cron can update sheets without a browser session
        if (account.refresh_token) {
          try {
            await sql`
              INSERT INTO google_tokens (id, refresh_token, access_token, expires_at, updated_at)
              VALUES (1, ${account.refresh_token}, ${account.access_token ?? null}, ${account.expires_at ?? null}, NOW())
              ON CONFLICT (id) DO UPDATE SET
                refresh_token = EXCLUDED.refresh_token,
                access_token = EXCLUDED.access_token,
                expires_at = EXCLUDED.expires_at,
                updated_at = NOW()
            `;
          } catch { /* non-fatal */ }
        }
      }

      // Refresh token if expired
      if (token.expiresAt && Date.now() / 1000 > (token.expiresAt as number)) {
        try {
          const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              grant_type: "refresh_token",
              refresh_token: token.refreshToken as string,
            }),
          });
          const data = await response.json();
          if (data.access_token) {
            token.accessToken = data.access_token;
            token.expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;
          }
        } catch {
          token.error = "RefreshAccessTokenError";
        }
      }

      return token;
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).accessToken = token.accessToken;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).error = token.error;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
