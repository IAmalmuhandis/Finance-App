import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectMongo } from "./mongodb";
import { User } from "./models/User";

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
        const ok = await bcrypt.compare(password, (user as any).passwordHash);
        if (!ok) return null;
        return { id: String((user as any)._id), email: (user as any).email, name: (user as any).name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }: any) {
      if (token?.id && session.user) session.user.id = token.id;
      return session;
    },
  },
};
