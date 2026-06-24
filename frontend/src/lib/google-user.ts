import { connectMongo } from "./mongodb";
import { User } from "./models/User";

/**
 * Create or update a user from Google OAuth.
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
    return String(user._id);
  }

  const existingGoogle = (user as { googleId?: string }).googleId;
  if (!existingGoogle) {
    await User.updateOne({ _id: user._id }, { $set: { googleId: args.googleSub } });
  }

  return String(user._id);
}
