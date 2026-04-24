import { connectMongo } from "./mongodb";
import { User } from "./models/User";
import { Account } from "./models/Account";

const defaultWallet = (userId: string) => ({
  userId,
  bankName: "Demo Bank",
  nickname: "Primary Account",
  type: "PERSONAL" as const,
  currency: "NGN",
  color: "#3B82F6",
});

/**
 * Create or update a user from Google OAuth and ensure they have a starter account.
 * Returns the MongoDB user id string.
 */
export async function upsertUserFromGoogle(args: {
  email: string;
  name: string | null | undefined;
  googleSub: string;
}): Promise<string> {
  await connectMongo();
  const email = args.email.trim().toLowerCase();
  if (!email) throw new Error("Google sign-in did not return an email");

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      email,
      name: args.name?.trim() || email.split("@")[0],
      googleId: args.googleSub,
    });
    await Account.create(defaultWallet(String(user._id)));
    return String(user._id);
  }

  const uid = String(user._id);
  const existingGoogle = (user as { googleId?: string }).googleId;
  if (!existingGoogle) {
    await User.updateOne({ _id: user._id }, { $set: { googleId: args.googleSub } });
  }

  const walletCount = await Account.countDocuments({ userId: uid });
  if (walletCount === 0) {
    await Account.create(defaultWallet(uid));
  }

  return uid;
}
