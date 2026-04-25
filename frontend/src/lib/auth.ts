import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { getGoogleOAuthClientSecret, getGoogleOAuthWebClientId } from "./google-client-id";
import { connectMongo } from "./mongodb";
import { User } from "./models/User";
import { upsertUserFromGoogle } from "./google-user";

const googleWebClientId = getGoogleOAuthWebClientId();
const googleClientSecret = getGoogleOAuthClientSecret();
const googleConfigured = googleWebClientId.length > 0 && googleClientSecret.length > 0;

export const authOptions: any = {
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;
        await connectMongo();
        const user = await User.findOne({ email }).lean();
        if (!user) return null;
        const hash = (user as { passwordHash?: string }).passwordHash;
        if (!hash) return null;
        const ok = await bcrypt.compare(password, hash);
        if (!ok) return null;
        return { id: String((user as any)._id), email: (user as any).email, name: (user as any).name };
      },
    }),
    ...(googleConfigured
      ? [
          GoogleProvider({
            clientId: googleWebClientId,
            clientSecret: googleClientSecret,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }: { user: any; account: any }) {
      if (account?.provider !== "google" || !user?.email) return true;
      await connectMongo();
      const email = String(user.email).toLowerCase();
      const existing = await User.findOne({ email }).lean();
      const gid = (existing as { googleId?: string } | null)?.googleId;
      if (gid && gid !== account.providerAccountId) {
        return "/?error=google_account";
      }
      return true;
    },
    async jwt({ token, user, account }: any) {
      if (account?.provider === "google" && user?.email) {
        const id = await upsertUserFromGoogle({
          email: user.email,
          name: user.name,
          googleSub: account.providerAccountId,
        });
        token.id = id;
        return token;
      }
      if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }: any) {
      if (token?.id && session.user) session.user.id = token.id;
      return session;
    },
  },
};
