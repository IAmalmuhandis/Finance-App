import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, index: true },
  name: { type: String },
  /** Set for email/password users; omitted for Google-only accounts. */
  passwordHash: { type: String },
  /** Google `sub` — links OAuth sign-in to this user. */
  googleId: { type: String, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.models.User || mongoose.model("User", UserSchema);

